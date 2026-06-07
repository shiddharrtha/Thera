from __future__ import annotations

import os
import uuid
from pathlib import Path

from app.analysis.vegetation import aggregate_frame_metrics, analyze_frame_vegetation, sample_video_frames
from app.analysis.yolo_detector import aggregate_yolo_metrics, analyze_frames_yolo
from app.config import settings
from typing import Literal

from app.models import AnalyzeScanRequest, AnalyzeScanResponse, DetectedIssue

FieldSeverity = Literal["unscanned", "healthy", "warning", "critical"]
AnalysisMode = Literal["yolo", "vegetation_cv"]


def _derive_severity(health_score: float, findings_count: int) -> FieldSeverity:
    if findings_count >= 4 or health_score < 60:
        return "critical"
    if health_score < 75 or findings_count >= 2:
        return "warning"
    return "healthy"


def _build_issues(
    *,
    weed_coverage: float,
    stress_coverage: float,
    acreage: float,
    crop_type: str,
) -> list[DetectedIssue]:
    issues: list[DetectedIssue] = []

    if weed_coverage >= 8:
        weed_acres = round(acreage * (weed_coverage / 100) * 0.65, 1)
        issues.append(
            DetectedIssue(
                id=f"issue_{uuid.uuid4().hex[:8]}",
                title="Elevated weed pressure detected along scan path",
                severity="high" if weed_coverage >= 20 else "medium",
                acres=weed_acres,
                confidence=round(min(0.95, 0.65 + weed_coverage / 100), 2),
                action="Apply targeted herbicide within 5–7 days",
            )
        )

    if stress_coverage >= 5:
        stress_acres = round(acreage * (stress_coverage / 100) * 0.5, 1)
        issues.append(
            DetectedIssue(
                id=f"issue_{uuid.uuid4().hex[:8]}",
                title=f"Early {crop_type} stress indicators",
                severity="medium" if stress_coverage >= 12 else "low",
                acres=stress_acres,
                confidence=round(min(0.9, 0.55 + stress_coverage / 100), 2),
                action="Monitor moisture, nutrient levels, and pest pressure",
            )
        )

    return issues


def _build_summary(
    *,
    weed_coverage: float,
    stress_coverage: float,
    crop_type: str,
    field_acres: float,
    spray_acres: float,
) -> str:
    if weed_coverage < 5 and stress_coverage < 5:
        return (
            f"Scan shows healthy {crop_type} across the field with minimal weed "
            f"({weed_coverage:.1f}%) and stress ({stress_coverage:.1f}%) coverage."
        )
    return (
        f"Detected weed pressure ({weed_coverage:.1f}%) and crop stress "
        f"({stress_coverage:.1f}%) across {field_acres:.1f} acres. "
        f"Targeted treatment recommended for {spray_acres:.1f} acres."
    )


def analyze_video_file(video_path: Path, request: AnalyzeScanRequest) -> AnalyzeScanResponse:
    frames = sample_video_frames(
        str(video_path),
        max_frames=settings.thera_max_frames,
        interval_sec=settings.thera_frame_interval_sec,
    )

    analysis_mode: AnalysisMode = "vegetation_cv"
    veg_metrics = [analyze_frame_vegetation(frame) for frame in frames]
    weed_coverage, stress_coverage, health_score = aggregate_frame_metrics(veg_metrics)

    if settings.thera_yolo_weights and os.path.exists(settings.thera_yolo_weights):
        yolo_metrics = analyze_frames_yolo(frames, settings.thera_yolo_weights)
        yolo_weed, yolo_stress = aggregate_yolo_metrics(yolo_metrics)
        weed_coverage = round((weed_coverage * 0.35) + (yolo_weed * 0.65), 1)
        stress_coverage = round((stress_coverage * 0.35) + (yolo_stress * 0.65), 1)
        health_score = max(0.0, min(100.0, 100.0 - (weed_coverage * 0.75) - (stress_coverage * 1.1)))
        analysis_mode = "yolo"

    weed_coverage = round(weed_coverage, 1)
    stress_coverage = round(stress_coverage, 1)
    health_score = round(health_score, 1)

    recommended_spray_acres = round(request.acreage * (weed_coverage / 100), 1)
    chemical_reduction_percent = max(
        0,
        round(100 - (recommended_spray_acres / request.acreage) * 100),
    )
    estimated_savings = round(recommended_spray_acres * 12 + request.acreage * 4)

    issues = _build_issues(
        weed_coverage=weed_coverage,
        stress_coverage=stress_coverage,
        acreage=request.acreage,
        crop_type=request.crop_type,
    )
    findings_count = len(issues)
    severity = _derive_severity(health_score, findings_count)

    return AnalyzeScanResponse(
        weed_coverage=weed_coverage,
        stress_coverage=stress_coverage,
        health_score=health_score,
        summary=_build_summary(
            weed_coverage=weed_coverage,
            stress_coverage=stress_coverage,
            crop_type=request.crop_type,
            field_acres=request.acreage,
            spray_acres=recommended_spray_acres,
        ),
        recommended_spray_acres=recommended_spray_acres,
        estimated_savings=estimated_savings,
        chemical_reduction_percent=chemical_reduction_percent,
        severity=severity,
        findings_count=findings_count,
        issues=issues,
        frames_analyzed=len(frames),
        analysis_mode=analysis_mode,
    )
