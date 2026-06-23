FROM python:3.12-slim

WORKDIR /app

# OpenCV runtime dependencies + ffmpeg for MP4 transcoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Slim deps for cloud (no torch/ultralytics — vegetation CV mode only)
COPY requirements-deploy.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV THERA_HOST=0.0.0.0

CMD ["./start.sh"]
