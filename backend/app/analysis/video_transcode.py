from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _is_likely_mp4(path: Path) -> bool:
    return path.suffix.lower() in {".mp4", ".m4v"}


def ensure_mp4_video(input_path: Path) -> tuple[Path, bool]:
    """
    Convert a scan video to H.264/AAC MP4 for storage and playback.
    Returns (mp4_path, was_transcoded). Caller should delete temp outputs when done.
    """
    if not ffmpeg_available():
        if _is_likely_mp4(input_path):
            return input_path, False
        raise RuntimeError(
            "ffmpeg is required to convert uploaded scan videos to MP4. "
            "Install ffmpeg on the analysis server."
        )

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_file.close()
    output_path = Path(temp_file.name)

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        raise RuntimeError(f"Could not convert scan video to MP4. {stderr[:240]}") from exc

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Video conversion produced an empty MP4 file.")

    if output_path.resolve() == input_path.resolve():
        return output_path, False

    return output_path, True
