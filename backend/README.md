# Thera Scan Analysis API

FastAPI service that analyzes field scan videos for weed pressure, crop stress, and treatment recommendations.

## What it does

1. Accepts a scan analysis request from the mobile app (Firebase-authenticated)
2. Downloads the video from Supabase Storage **or** receives a direct upload when cloud upload was skipped
3. Samples frames from the video and runs computer vision analysis
4. Optionally blends in YOLO detections when custom weights are provided
5. Returns metrics and report data consumed by the mobile app

## Quick start

Requires **Python 3.12+** (system `python3` on macOS is often too old).

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_PROJECT_ID
# Download Firebase service account JSON → backend/firebase-service-account.json
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

```bash
curl http://localhost:8000/health
```

## Deploy to Railway or Render (public URL for Vercel / mobile)

The analysis API cannot run on Vercel (video processing). Host it on **Railway** or **Render**, then point the app at the public URL.

### Railway (recommended)

1. Create a project at [railway.app](https://railway.app) → **Deploy from GitHub** → select this repo
2. Set **Root directory** to `backend` (or deploy using `backend/Dockerfile`)
3. Add environment variables from `backend/.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `THERA_ANALYSIS_API_KEY` (same value as `EXPO_PUBLIC_ANALYSIS_API_KEY` in the app)
   - `THERA_CORS_ORIGINS=*` (or your `https://your-app.vercel.app` domain)
   - Optional: `FIREBASE_PROJECT_ID` + paste service account JSON as `GOOGLE_APPLICATION_CREDENTIALS_JSON` if using Firebase tokens (not needed if using API key only)
4. Railway assigns a URL like `https://thera-production.up.railway.app`
5. Verify: `curl https://YOUR-URL/health`

### Point Vercel at the hosted API

1. Vercel → **Project → Settings → Environment Variables**
2. Set `EXPO_PUBLIC_ANALYSIS_API_URL=https://YOUR-RAILWAY-URL` (no trailing slash)
3. Set `EXPO_PUBLIC_ANALYSIS_API_KEY` to match `THERA_ANALYSIS_API_KEY`
4. **Redeploy** the Vercel project (env vars are baked in at build time)

Open your Vercel URL in a browser — scans will hit the cloud API instead of your Mac.

### iPhone dev app (optional)

Update project `.env`:

```bash
EXPO_PUBLIC_ANALYSIS_API_URL=https://YOUR-RAILWAY-URL
EXPO_PUBLIC_ANALYSIS_API_KEY=dev-only-key
```

Restart Metro and reload the app. No Mac IP needed.

### Quick test without cloud deploy (ngrok)

Expose your local backend temporarily:

```bash
# Terminal 1
npm run analysis:dev

# Terminal 2
ngrok http 8000
```

Use the `https://xxxx.ngrok-free.app` URL as `EXPO_PUBLIC_ANALYSIS_API_URL` on Vercel, then redeploy. Good for a few hours of testing; URL changes when ngrok restarts.

## Mobile app configuration

Add to your project `.env`:

```bash
# Use your Mac's LAN IP so a physical iPhone can reach the server
EXPO_PUBLIC_ANALYSIS_API_URL=http://192.168.1.42:8000

# Optional dev bypass (must match THERA_ANALYSIS_API_KEY in backend/.env)
EXPO_PUBLIC_ANALYSIS_API_KEY=dev-only-key
```

Restart Metro after changing env vars.

## Authentication

**Production:** send `Authorization: Bearer <firebase_id_token>` from the signed-in user. Configure:

- `FIREBASE_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`

**Local dev:** set matching `THERA_ANALYSIS_API_KEY` / `EXPO_PUBLIC_ANALYSIS_API_KEY` to skip Firebase admin setup.

## API

### `GET /health`

Health check.

### `POST /v1/scans/analyze`

Analyze a video already stored in Supabase Storage.

```json
{
  "scan_id": "scan_...",
  "field_id": "field_...",
  "user_id": "firebase_uid",
  "video_path": "firebase_uid/scan_....mp4",
  "acreage": 120,
  "crop_type": "corn",
  "video_duration_seconds": 45,
  "gps_track": []
}
```

### `POST /v1/scans/analyze/upload`

Multipart upload when the app only has a local video file.

- `payload` — JSON string (same shape as above, without `video_path`)
- `video` — MP4 file

## YOLO custom weights

By default the service uses vegetation color segmentation (OpenCV). To use a custom weed/stress YOLO model:

1. Place your `.pt` weights file in `backend/models/`
2. Set `THERA_YOLO_WEIGHTS=./models/your_model.pt`

Class names containing `weed`, `stress`, `disease`, etc. are mapped automatically.

## Analysis tuning

| Env var | Default | Description |
|---------|---------|-------------|
| `THERA_MAX_FRAMES` | 24 | Max frames sampled per video |
| `THERA_FRAME_INTERVAL_SEC` | 2.0 | Seconds between sampled frames |

## Notes

- First run downloads YOLO base weights if ultralytics is installed and custom weights are configured.
- Videos are deleted from temp storage immediately after analysis.
- The service role key is required to read private videos from the `scan-videos` bucket.
