from __future__ import annotations

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth, credentials

from app.config import settings

_firebase_initialized = False


def _ensure_firebase() -> bool:
    global _firebase_initialized
    if _firebase_initialized:
        return True

    if not settings.firebase_project_id:
        return False

    try:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(
                credentials.ApplicationDefault(),
                {"projectId": settings.firebase_project_id},
            )
        _firebase_initialized = True
        return True
    except Exception:
        return False


def verify_request_auth(
    authorization: str | None = Header(default=None),
    x_thera_api_key: str | None = Header(default=None),
) -> str:
    """Return authenticated user id."""
    if settings.thera_analysis_api_key and x_thera_api_key == settings.thera_analysis_api_key:
        return "dev-api-key"

    if settings.thera_analysis_api_key and not x_thera_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Missing X-Thera-Api-Key header. Set EXPO_PUBLIC_ANALYSIS_API_KEY in the app "
                "to match THERA_ANALYSIS_API_KEY in backend/.env."
            ),
        )

    if settings.thera_analysis_api_key and x_thera_api_key and x_thera_api_key != settings.thera_analysis_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Thera-Api-Key.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token.",
        )

    if not _ensure_firebase():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Firebase admin is not configured. Set FIREBASE_PROJECT_ID and "
                "GOOGLE_APPLICATION_CREDENTIALS, or use X-Thera-Api-Key in development."
            ),
        )

    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token: {exc}",
        ) from exc

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token missing uid.",
        )
    return uid
