from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

import logging
import time

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.analysis.pipeline import analyze_video_file
from app.auth import verify_request_auth
from app.config import settings
from app.models import AnalyzeScanRequest, AnalyzeScanResponse
from app.storage import download_scan_video, upload_scan_video


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="Thera Scan Analysis API",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [origin.strip() for origin in settings.thera_cors_origins.split(",") if origin.strip()]
allow_all_origins = origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if allow_all_origins else origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("thera.analysis")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - started) * 1000)
    logger.info("%s %s -> %s (%sms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _run_analysis(request: AnalyzeScanRequest, uploaded_path: Path | None) -> AnalyzeScanResponse:
    video_path: Path | None = uploaded_path
    try:
        if video_path is None:
            video_path = await download_scan_video(
                video_path=request.video_path,
                local_video_url=request.local_video_url,
            )
        return analyze_video_file(video_path, request)
    finally:
        if video_path and video_path.exists():
            try:
                os.unlink(video_path)
            except OSError:
                pass


@app.post("/v1/scans/analyze", response_model=AnalyzeScanResponse)
async def analyze_scan(
    request: AnalyzeScanRequest,
    auth_uid: str = Depends(verify_request_auth),
) -> AnalyzeScanResponse:
    if auth_uid != "dev-api-key" and auth_uid != request.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user does not match scan owner.",
        )

    if not request.video_path and not request.local_video_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide video_path (Supabase storage path) or local_video_url.",
        )

    try:
        return await _run_analysis(request, None)
    except ValueError as exc:
        logger.exception("Analysis request invalid: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Analysis request failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan analysis failed: {exc}",
        ) from exc


@app.post("/v1/scans/analyze/upload", response_model=AnalyzeScanResponse)
async def analyze_scan_upload(
    payload: str = Form(...),
    video: UploadFile = File(...),
    auth_uid: str = Depends(verify_request_auth),
) -> AnalyzeScanResponse:
    try:
        request = AnalyzeScanRequest.model_validate(json.loads(payload))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis payload: {exc}",
        ) from exc

    if auth_uid != "dev-api-key" and auth_uid != request.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user does not match scan owner.",
        )

    suffix = Path(video.filename or "scan.mp4").suffix or ".mp4"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    video_path: str | None = request.video_path
    try:
        content = await video.read()
        temp_file.write(content)
        temp_file.close()
        temp_path = Path(temp_file.name)

        if not video_path:
            try:
                video_path = await upload_scan_video(request.user_id, request.scan_id, temp_path)
                logger.info("Backed up scan %s to %s", request.scan_id, video_path)
            except Exception as exc:
                logger.warning("Cloud backup failed for scan %s: %s", request.scan_id, exc)

        response = await _run_analysis(request, temp_path)
        if video_path:
            return response.model_copy(update={"video_path": video_path})
        return response
    except ValueError as exc:
        logger.exception("Analysis request invalid: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Analysis request failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan analysis failed: {exc}",
        ) from exc
