from typing import Literal

from pydantic import BaseModel, Field


class GpsPoint(BaseModel):
    latitude: float
    longitude: float
    timestamp: str
    accuracy: float | None = None


class AnalyzeScanRequest(BaseModel):
    scan_id: str
    field_id: str
    user_id: str
    video_path: str | None = None
    local_video_url: str | None = Field(
        default=None,
        description="Optional signed URL or reachable URL when video is not yet in Supabase.",
    )
    acreage: float = Field(gt=0)
    crop_type: str = "corn"
    video_duration_seconds: float | None = None
    gps_track: list[GpsPoint] = Field(default_factory=list)


class DetectedIssue(BaseModel):
    id: str
    title: str
    severity: Literal["low", "medium", "high"]
    acres: float
    confidence: float
    action: str


class AnalyzeScanResponse(BaseModel):
    weed_coverage: float
    stress_coverage: float
    health_score: float
    summary: str
    recommended_spray_acres: float
    estimated_savings: float
    chemical_reduction_percent: float
    severity: Literal["unscanned", "healthy", "warning", "critical"]
    findings_count: int
    issues: list[DetectedIssue]
    frames_analyzed: int
    analysis_mode: Literal["yolo", "vegetation_cv"]
