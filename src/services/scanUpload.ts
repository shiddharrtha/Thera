import { File } from 'expo-file-system';
import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';

export const SCAN_VIDEOS_BUCKET = 'scan-videos';
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function refreshFirebaseToken(force = true) {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
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

  if (code === '42501') {
    return 'Storage permissions blocked the upload. Run supabase/add-scan-video-storage.sql';
  }

  if (/timed out/i.test(message)) {
    return 'Upload took too long. Check your connection and try again.';
  }

  return message;
}

async function readVideoPayload(localUri: string): Promise<ArrayBuffer | Blob> {
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Scan video file was not found on this device.');
  }

  try {
    const response = await fetch(localUri);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) return blob;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[scanUpload] fetch(localUri) failed, falling back to bytes()', error);
    }
  }

  const bytes = await file.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Upload a local scan video to Supabase Storage. Returns the object path in the bucket. */
export async function uploadScanVideoFile(
  userId: string,
  scanId: string,
  localUri: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const storagePath = getScanVideoStoragePath(userId, scanId);

  onProgress?.(5);
  await refreshFirebaseToken(true);

  onProgress?.(10);
  const payload = await withTimeout(
    readVideoPayload(localUri),
    UPLOAD_TIMEOUT_MS,
    'Reading scan video',
  );
  onProgress?.(35);

  const delays = [0, 1500, 3000];
  let lastError: unknown;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    await refreshFirebaseToken(true);

    try {
      onProgress?.(55);
      const { error } = await withTimeout(
        supabase.storage
          .from(SCAN_VIDEOS_BUCKET)
          .upload(storagePath, payload, {
            contentType: 'video/mp4',
            upsert: true,
            cacheControl: '3600',
          }),
        UPLOAD_TIMEOUT_MS,
        'Uploading scan video',
      );

      if (error) throw error;

      onProgress?.(100);
      return storagePath;
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[scanUpload] upload attempt failed', error);
      }
    }
  }

  throw lastError ?? new Error('Could not upload scan video.');
}

/** Get a short-lived signed URL for playback (1 hour). */
export async function getScanVideoSignedUrl(storagePath: string) {
  await refreshFirebaseToken(true);
  const { data, error } = await supabase.storage
    .from(SCAN_VIDEOS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}
