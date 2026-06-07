from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class FrameMetrics:
    weed_ratio: float
    stress_ratio: float
    healthy_ratio: float


def sample_video_frames(
    video_path: str,
    *,
    max_frames: int,
    interval_sec: float,
) -> list[np.ndarray]:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError("Could not open scan video for analysis.")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, int(fps * interval_sec))

    frames: list[np.ndarray] = []
    indices = list(range(0, max(frame_count, step), step))[:max_frames]

    for index in indices:
        capture.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = capture.read()
        if ok and frame is not None:
            frames.append(frame)

    if not frames:
        ok, frame = capture.read()
        if ok and frame is not None:
            frames.append(frame)

    capture.release()
    if not frames:
        raise RuntimeError("Scan video contained no readable frames.")
    return frames


def analyze_frame_vegetation(frame: np.ndarray) -> FrameMetrics:
    """Estimate weed/stress coverage using color segmentation in the crop band."""
    height, width = frame.shape[:2]
    crop_band = frame[int(height * 0.2) : int(height * 0.95), :]

    hsv = cv2.cvtColor(crop_band, cv2.COLOR_BGR2HSV)
    total_pixels = crop_band.shape[0] * crop_band.shape[1]
    if total_pixels == 0:
        return FrameMetrics(weed_ratio=0.0, stress_ratio=0.0, healthy_ratio=1.0)

    healthy_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
    stress_mask = cv2.inRange(hsv, (10, 35, 40), (34, 255, 255))
    weed_mask = cv2.inRange(hsv, (25, 25, 15), (95, 255, 120))

    weed_mask = cv2.bitwise_and(weed_mask, cv2.bitwise_not(healthy_mask))
    stress_mask = cv2.bitwise_and(stress_mask, cv2.bitwise_not(healthy_mask))

    healthy_ratio = float(np.count_nonzero(healthy_mask)) / total_pixels
    stress_ratio = float(np.count_nonzero(stress_mask)) / total_pixels
    weed_ratio = float(np.count_nonzero(weed_mask)) / total_pixels

    return FrameMetrics(
        weed_ratio=min(1.0, weed_ratio),
        stress_ratio=min(1.0, stress_ratio),
        healthy_ratio=min(1.0, healthy_ratio),
    )


def aggregate_frame_metrics(metrics: list[FrameMetrics]) -> tuple[float, float, float]:
    if not metrics:
        return 0.0, 0.0, 100.0

    weed = float(np.mean([m.weed_ratio for m in metrics]))
    stress = float(np.mean([m.stress_ratio for m in metrics]))
    health = max(0.0, min(100.0, 100.0 - (weed * 100 * 0.75) - (stress * 100 * 1.1)))
    return weed * 100, stress * 100, health
