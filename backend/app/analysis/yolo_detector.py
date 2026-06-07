from __future__ import annotations

from dataclasses import dataclass

import numpy as np

_yolo_model = None


@dataclass
class YoloFrameMetrics:
    weed_ratio: float
    stress_ratio: float


def _load_yolo(weights_path: str):
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO

        _yolo_model = YOLO(weights_path)
    return _yolo_model


def analyze_frames_yolo(frames: list[np.ndarray], weights_path: str) -> list[YoloFrameMetrics]:
    model = _load_yolo(weights_path)
    results: list[YoloFrameMetrics] = []

    weed_keywords = {"weed", "weeds", "volunteer", "thistle", "pigweed", "lambsquarters"}
    stress_keywords = {"stress", "disease", "yellow", "wilting", "damage", "pest"}

    for frame in frames:
        height, width = frame.shape[:2]
        total_area = float(height * width) if height and width else 1.0
        prediction = model.predict(frame, verbose=False)[0]

        weed_area = 0.0
        stress_area = 0.0

        if prediction.boxes is not None and len(prediction.boxes) > 0:
            names = prediction.names or {}
            for box in prediction.boxes:
                cls_id = int(box.cls[0])
                label = str(names.get(cls_id, "")).lower()
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                area = max(0.0, (x2 - x1) * (y2 - y1))
                if any(keyword in label for keyword in weed_keywords):
                    weed_area += area
                elif any(keyword in label for keyword in stress_keywords):
                    stress_area += area

        results.append(
            YoloFrameMetrics(
                weed_ratio=min(1.0, weed_area / total_area),
                stress_ratio=min(1.0, stress_area / total_area),
            )
        )

    return results


def aggregate_yolo_metrics(metrics: list[YoloFrameMetrics]) -> tuple[float, float]:
    if not metrics:
        return 0.0, 0.0
    weed = float(np.mean([m.weed_ratio for m in metrics])) * 100
    stress = float(np.mean([m.stress_ratio for m in metrics])) * 100
    return weed, stress
