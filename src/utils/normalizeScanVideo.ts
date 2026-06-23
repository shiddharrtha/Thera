import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { cacheWebVideoBlob } from './webVideoBlobCache';

export const MIN_SCAN_VIDEO_SECONDS = 3;
export const MAX_SCAN_VIDEO_SECONDS = 600;

export function inferVideoExtension(source: string, mimeType?: string | null): string {
  if (mimeType?.includes('webm')) return 'webm';
  if (mimeType?.includes('quicktime') || mimeType?.includes('mov')) return 'mov';
  const match = source.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext && ['mp4', 'mov', 'webm', 'm4v', '3gp'].includes(ext)) return ext;
  return 'mp4';
}

function getWebVideoDurationSeconds(uri: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(0);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      resolve(Math.max(0, Math.round(duration)));
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Could not read video duration.'));
    };
    video.src = uri;
  });
}

async function readSourceBytes(sourceUri: string): Promise<Uint8Array> {
  if (sourceUri.startsWith('blob:') || sourceUri.startsWith('http')) {
    const response = await globalThis.fetch(sourceUri);
    if (!response.ok) {
      throw new Error('Could not read the selected video.');
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const sourceFile = new File(sourceUri);
  if (!sourceFile.exists) {
    throw new Error('Video file was not found on this device.');
  }
  return sourceFile.bytes();
}

/**
 * Native: copy videos into Documents/scans as .mp4.
 * Web: keep the browser blob as-is (analysis server transcodes to MP4 for storage).
 */
export async function persistScanVideoAsMp4(
  sourceUri: string,
  options?: { mimeType?: string | null; durationSeconds?: number },
): Promise<{ videoUri: string; durationSeconds: number; sourceExtension: string }> {
  const sourceExtension = inferVideoExtension(sourceUri, options?.mimeType);
  let durationSeconds = options?.durationSeconds ?? 0;

  if (Platform.OS === 'web') {
    if (!durationSeconds) {
      durationSeconds = await getWebVideoDurationSeconds(sourceUri);
    }

    const response = await globalThis.fetch(sourceUri);
    if (!response.ok) {
      throw new Error('Could not read the selected video.');
    }
    const blob = await response.blob();
    const typedBlob =
      blob.type && blob.type !== 'application/octet-stream'
        ? blob
        : new Blob([blob], { type: options?.mimeType ?? 'video/mp4' });

    const objectUrl = URL.createObjectURL(typedBlob);
    cacheWebVideoBlob(objectUrl, typedBlob);

    return {
      videoUri: objectUrl,
      durationSeconds,
      sourceExtension,
    };
  }

  const scansDir = new Directory(Paths.document, 'scans');
  if (!scansDir.exists) {
    scansDir.create({ idempotent: true });
  }

  const destFile = new File(scansDir, `scan_${Date.now()}.mp4`);

  if (!sourceUri.startsWith('blob:') && !sourceUri.startsWith('http')) {
    const sourceFile = new File(sourceUri);
    if (!sourceFile.exists) {
      throw new Error('Video file was not found on this device.');
    }
    await sourceFile.copy(destFile);
  } else {
    const bytes = await readSourceBytes(sourceUri);
    await destFile.write(bytes);
  }

  return {
    videoUri: destFile.uri,
    durationSeconds,
    sourceExtension,
  };
}

export async function captureFromWebVideoFile(file: globalThis.File): Promise<{
  videoUri: string;
  durationSeconds: number;
  mimeType: string;
  extension: string;
}> {
  if (!file.type.startsWith('video/')) {
    throw new Error('Please choose a video file (MP4, MOV, or WebM).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const durationSeconds = await getWebVideoDurationSeconds(objectUrl);
    cacheWebVideoBlob(objectUrl, file);
    return {
      videoUri: objectUrl,
      durationSeconds,
      mimeType: file.type,
      extension: inferVideoExtension(file.name, file.type),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export function validateScanDuration(durationSeconds: number): void {
  if (!Number.isFinite(durationSeconds) || durationSeconds < MIN_SCAN_VIDEO_SECONDS) {
    throw new Error(`Videos must be at least ${MIN_SCAN_VIDEO_SECONDS} seconds long.`);
  }
  if (durationSeconds > MAX_SCAN_VIDEO_SECONDS) {
    throw new Error(`Videos must be ${MAX_SCAN_VIDEO_SECONDS / 60} minutes or shorter.`);
  }
}
