FROM python:3.12-slim

WORKDIR /app

# OpenCV runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV THERA_HOST=0.0.0.0

# Railway/Render set PORT; default 8000 for local Docker runs
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
