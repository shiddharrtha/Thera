#!/bin/sh
set -e

PORT="${PORT:-8000}"

echo "=== Thera Analysis API ==="
echo "PORT=${PORT}"

if [ -z "${SUPABASE_URL}" ]; then
  echo "FATAL: SUPABASE_URL is not set."
  echo "Railway → Service → Variables → add SUPABASE_URL"
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY}" ]; then
  echo "FATAL: SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "Railway → Service → Variables → add SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "Environment OK. Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
