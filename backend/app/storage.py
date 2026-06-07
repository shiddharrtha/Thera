from __future__ import annotations

import tempfile
from pathlib import Path

import httpx

from app.config import settings


async def download_scan_video(
    *,
    video_path: str | None,
    local_video_url: str | None,
) -> Path:
    if local_video_url:
        return await _download_url(local_video_url)

    if not video_path:
        raise ValueError("Either video_path or local_video_url is required.")

    storage_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{settings.scan_videos_bucket}/{video_path.lstrip('/')}"
    )
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(storage_url, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(
                f"Could not download scan video ({response.status_code}): {response.text[:200]}"
            )
        suffix = Path(video_path).suffix or ".mp4"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(response.content)
        temp_file.close()
        return Path(temp_file.name)


async def _download_url(url: str) -> Path:
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        response = await client.get(url)
        if response.status_code != 200:
            raise RuntimeError(
                f"Could not download video URL ({response.status_code}): {response.text[:200]}"
            )
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        temp_file.write(response.content)
        temp_file.close()
        return Path(temp_file.name)
