import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { createAbortError } from '../utils/abortError';
import { persistScanVideoAsMp4 } from '../utils/normalizeScanVideo';
import { readVideoBlob } from '../utils/readVideoBlob';

export const SCAN_VIDEOS_BUCKET = 'scan-videos';
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

async function getFreshFirebaseToken(): Promise<string> {
  const user = firebaseAuth().currentUser;
  if (!user) {
    throw new Error('Sign in to upload scan videos.');
  }
  return user.getIdToken(true);
}

export function getScanVideoStoragePath(userId: string, scanId: string) {
  return `${userId}/${scanId}.mp4`;
}

export function getScanVideoErrorMessage(error: unknown): string {
  const code = (error as { code?: string; statusCode?: string })?.code
    ?? (error as { statusCode?: string })?.statusCode;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not upload scan video.';

  if (code === 'PGRST204' || code === '42703' || /video_url|video_duration|gps_track/i.test(message)) {
    return 'Scan video columns are missing. Run: npm run db:migrate-scan-video';
  }

  if (code === '404' || /bucket not found|scan-videos/i.test(message)) {
    return 'Scan video storage is not set up. Run: npm run db:migrate-scan-video';
  }

  if (code === '42501' || /row-level security|permission denied|403/i.test(message)) {
    return 'Storage permissions blocked the upload. Enable Firebase auth in Supabase and run db:migrate-scan-video.';
  }

  if (/timed out/i.test(message)) {
    return 'Upload took too long. Check your connection and try again.';
  }

  return message;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured in .env');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/+$/, ''), anonKey };
}

/** Direct Storage REST upload — more reliable on React Native than the JS client. */
async function uploadViaStorageRest(
  storagePath: string,
  blob: Blob,
  token: string,
  signal?: AbortSignal,
): Promise<void> {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  const url = `${supabaseUrl}/storage/v1/object/${SCAN_VIDEOS_BUCKET}/${encodedPath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: blob,
    signal,
  });

  if (response.ok) return;

  let detail = `Upload failed (${response.status})`;
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    detail = body.message ?? body.error ?? detail;
  } catch {
    // ignore parse errors
  }

  const error = new Error(detail) as Error & { statusCode?: string };
  error.statusCode = String(response.status);
  throw error;
}

async function uploadViaSupabaseClient(storagePath: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(SCAN_VIDEOS_BUCKET).upload(storagePath, blob, {
    contentType: 'video/mp4',
    upsert: true,
    cacheControl: '3600',
  });

  if (error) throw error;
}

/** Upload a local scan video to Supabase Storage. Returns the object path in the bucket. */
export async function uploadScanVideoFile(
  userId: string,
  scanId: string,
  localUri: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const storagePath = getScanVideoStoragePath(userId, scanId);

  assertNotAborted(signal);
  onProgress?.(5);

  const uploadUri =
    Platform.OS === 'web' ? localUri : (await persistScanVideoAsMp4(localUri)).videoUri;

  assertNotAborted(signal);
  onProgress?.(10);
  const blob = await withTimeout(
    readVideoBlob(uploadUri),
    UPLOAD_TIMEOUT_MS,
    'Reading scan video',
    signal,
  );
  onProgress?.(35);

  const delays = [0, 1500, 3000];
  let lastError: unknown;

  for (const delay of delays) {
    assertNotAborted(signal);
    if (delay > 0) await sleep(delay);

    try {
      onProgress?.(55);
      const token = await getFreshFirebaseToken();

      await withTimeout(
        uploadViaStorageRest(storagePath, blob, token, signal),
        UPLOAD_TIMEOUT_MS,
        'Uploading scan video',
        signal,
      );

      onProgress?.(100);
      return storagePath;
    } catch (restError) {
      if (__DEV__) {
        console.warn('[scanUpload] REST upload failed, trying supabase client', restError);
      }

      try {
        await getFreshFirebaseToken();
        await withTimeout(
          uploadViaSupabaseClient(storagePath, blob),
          UPLOAD_TIMEOUT_MS,
          'Uploading scan video',
          signal,
        );
        onProgress?.(100);
        return storagePath;
      } catch (clientError) {
        lastError = clientError;
        if (__DEV__) {
          console.warn('[scanUpload] client upload attempt failed', clientError);
        }
      }
    }
  }

  throw lastError ?? new Error('Could not upload scan video.');
}

/** Get a short-lived signed URL for playback (1 hour). */
export async function getScanVideoSignedUrl(storagePath: string) {
  await getFreshFirebaseToken();
  const { data, error } = await supabase.storage
    .from(SCAN_VIDEOS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}
