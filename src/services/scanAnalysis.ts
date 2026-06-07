import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { firebaseAuth } from '../lib/firebase';
import type { DetectedIssue, Field, FieldStatus, GpsPoint, Scan } from '../types/models';
import { createAbortError, isAbortError } from '../utils/abortError';
import { appendVideoToFormData } from '../utils/videoFormData';

const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;

export interface ScanAnalysisResult {
  weedCoverage: number;
  stressCoverage: number;
  healthScore: number;
  summary: string;
  recommendedSprayAcres: number;
  estimatedSavings: number;
  chemicalReductionPercent: number;
  severity: FieldStatus;
  findingsCount: number;
  issues: DetectedIssue[];
  framesAnalyzed: number;
  analysisMode: 'yolo' | 'vegetation_cv';
  videoPath?: string;
}

type AnalysisApiResponse = {
  weed_coverage: number;
  stress_coverage: number;
  health_score: number;
  summary: string;
  recommended_spray_acres: number;
  estimated_savings: number;
  chemical_reduction_percent: number;
  severity: FieldStatus;
  findings_count: number;
  issues: DetectedIssue[];
  frames_analyzed: number;
  analysis_mode: 'yolo' | 'vegetation_cv';
  video_path?: string | null;
};

function normalizeAnalysisApiUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  // Allow bare host/IP in .env (e.g. 192.168.1.197 → http://192.168.1.197:8000)
  const parsed = new URL(url);
  if (!parsed.port && parsed.protocol === 'http:') {
    parsed.port = '8000';
    url = parsed.toString().replace(/\/$/, '');
  }

  return url;
}

function getAnalysisApiUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
  if (!url) return null;
  return normalizeAnalysisApiUrl(url);
}

export function isAnalysisApiConfigured(): boolean {
  return Boolean(getAnalysisApiUrl());
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const devApiKey = process.env.EXPO_PUBLIC_ANALYSIS_API_KEY?.trim();
  if (devApiKey) {
    headers['X-Thera-Api-Key'] = devApiKey;
  }

  const user = firebaseAuth().currentUser;
  if (user) {
    const token = await user.getIdToken(true);
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function mapAnalysisResponse(body: AnalysisApiResponse): ScanAnalysisResult {
  return {
    weedCoverage: body.weed_coverage,
    stressCoverage: body.stress_coverage,
    healthScore: body.health_score,
    summary: body.summary,
    recommendedSprayAcres: body.recommended_spray_acres,
    estimatedSavings: body.estimated_savings,
    chemicalReductionPercent: body.chemical_reduction_percent,
    severity: body.severity,
    findingsCount: body.findings_count,
    issues: body.issues ?? [],
    framesAnalyzed: body.frames_analyzed,
    analysisMode: body.analysis_mode,
    videoPath: body.video_path ?? undefined,
  };
}

function buildAnalysisPayload(
  scan: Scan,
  field: Field,
  userId: string,
): Record<string, unknown> {
  return {
    scan_id: scan.id,
    field_id: field.id,
    user_id: userId,
    video_path: scan.videoUrl ?? null,
    acreage: field.acreage,
    crop_type: field.cropType,
    video_duration_seconds: scan.videoDurationSeconds ?? null,
    gps_track: scan.gpsTrack ?? [],
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(createAbortError());
        return;
      }
      signal.addEventListener('abort', onAbort);
    }

    promise.then(
      (value) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

async function assertLocalVideoExists(localUri: string): Promise<void> {
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Scan video file was not found on this device.');
  }
}

export function isScanCancelledError(error: unknown): boolean {
  return isAbortError(error);
}

export function getScanAnalysisErrorMessage(error: unknown): string {
  if (isScanCancelledError(error)) {
    return 'Scan cancelled.';
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Scan analysis failed.';

  if (/Unsupported FormDataPart/i.test(message)) {
    return 'Video upload failed on this device. Reload the app and try again.';
  }

  if (/timed out/i.test(message)) {
    return 'Analysis took too long. Check your connection and try again.';
  }

  if (/Network request failed|Could not reach|fetch/i.test(message)) {
    return 'Could not reach the analysis server. Check EXPO_PUBLIC_ANALYSIS_API_URL and that the backend is running.';
  }

  return message;
}

/** Run AI analysis for a scan via the Thera analysis API. */
export async function analyzeScanVideo(
  scan: Scan,
  field: Field,
  userId: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ScanAnalysisResult> {
  const baseUrl = getAnalysisApiUrl();
  if (!baseUrl) {
    throw new Error('Analysis API URL is not configured.');
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  onProgress?.(5);
  const headers = await getAuthHeaders();
  const payload = buildAnalysisPayload(scan, field, userId);

  onProgress?.(15);

  const useMultipart = Boolean(scan.videoUri && !scan.videoUrl);
  const endpoint = useMultipart
    ? `${baseUrl}/v1/scans/analyze/upload`
    : `${baseUrl}/v1/scans/analyze`;

  let response: Response;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let heartbeatProgress = 35;

  const startHeartbeat = () => {
    heartbeat = setInterval(() => {
      if (signal?.aborted) return;
      heartbeatProgress = Math.min(heartbeatProgress + 4, 84);
      onProgress?.(heartbeatProgress);
    }, 2000);
  };

  const stopHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
  };

  try {
    if (useMultipart) {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));

      onProgress?.(20);
      startHeartbeat();
      heartbeatProgress = 22;

      await assertLocalVideoExists(scan.videoUri!);
      await appendVideoToFormData(formData, 'video', scan.videoUri!, `${scan.id}.mp4`);

      onProgress?.(35);
      heartbeatProgress = 35;
      response = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers,
          body: formData,
          signal,
        }),
        ANALYSIS_TIMEOUT_MS,
        'Scan analysis upload',
        signal,
      );
    } else {
      onProgress?.(35);
      startHeartbeat();
      response = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal,
        }),
        ANALYSIS_TIMEOUT_MS,
        'Scan analysis',
        signal,
      );
    }
  } finally {
    stopHeartbeat();
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  onProgress?.(85);

  let body: AnalysisApiResponse & { detail?: string };
  try {
    body = (await response.json()) as AnalysisApiResponse & { detail?: string };
  } catch {
    throw new Error(`Analysis server returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(body.detail ?? `Analysis failed (${response.status}).`);
  }

  onProgress?.(100);
  return mapAnalysisResponse(body);
}
