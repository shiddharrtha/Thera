from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    thera_host: str = "0.0.0.0"
    thera_port: int = 8000
    thera_cors_origins: str = "*"
    thera_analysis_api_key: str | None = None
    thera_max_frames: int = 24
    thera_frame_interval_sec: float = 2.0
    thera_yolo_weights: str | None = None

    supabase_url: str
    supabase_service_role_key: str

    firebase_project_id: str | None = None

    scan_videos_bucket: str = "scan-videos"


def _normalize_supabase_url(url: str) -> str:
    cleaned = url.strip().rstrip("/")
    if cleaned.endswith("/rest/v1"):
        cleaned = cleaned[: -len("/rest/v1")]
    return cleaned


class _SettingsProxy:
    """Expose normalized settings (e.g. strip accidental /rest/v1 from Supabase URL)."""

    def __getattr__(self, name: str):
        value = getattr(_settings, name)
        if name == "supabase_url" and isinstance(value, str):
            return _normalize_supabase_url(value)
        return value


_settings = Settings()
settings = _SettingsProxy()
