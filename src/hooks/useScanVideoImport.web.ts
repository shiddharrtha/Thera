import { useCallback, useRef, useState } from 'react';
import type { ScanCapture } from '../types/models';
import { toIsoTimestamp } from '../utils/timestamps';
import {
  captureFromWebVideoFile,
  inferVideoExtension,
  MIN_SCAN_VIDEO_SECONDS,
  validateScanDuration,
} from '../utils/normalizeScanVideo';
import type { UseScanVideoImportResult } from './useScanVideoImport.types';

async function buildCaptureFromWebFile(file: globalThis.File): Promise<ScanCapture> {
  const picked = await captureFromWebVideoFile(file);
  const durationSeconds =
    picked.durationSeconds >= MIN_SCAN_VIDEO_SECONDS
      ? picked.durationSeconds
      : MIN_SCAN_VIDEO_SECONDS;
  validateScanDuration(durationSeconds);

  const recordedEndAtMs = Date.now();
  const recordedAtMs = recordedEndAtMs - durationSeconds * 1000;

  return {
    videoUri: picked.videoUri,
    durationSeconds,
    gpsTrack: [],
    recordedAtMs,
    recordedEndAtMs,
    recordedAt: toIsoTimestamp(recordedAtMs),
    recordedEndAt: toIsoTimestamp(recordedEndAtMs),
    videoExtension: picked.extension,
    videoMimeType: picked.mimeType,
  };
}

export function useScanVideoImport(): UseScanVideoImportResult {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolverRef = useRef<((file: globalThis.File | null) => void) | null>(null);

  const pickFile = useCallback((input: HTMLInputElement | null) => {
    return new Promise<globalThis.File | null>((resolve) => {
      resolverRef.current = resolve;
      input?.click();
    });
  }, []);

  const runImport = useCallback(async (file: globalThis.File | null) => {
    if (!file) return null;

    setError(null);
    setBusy(true);
    try {
      return await buildCaptureFromWebFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import video.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const importFromLibrary = useCallback(async () => {
    const file = await pickFile(fileInputRef.current);
    return runImport(file);
  }, [pickFile, runImport]);

  const resolvePickedFile = useCallback((file: globalThis.File | null) => {
    resolverRef.current?.(file);
    resolverRef.current = null;
  }, []);

  return {
    busy,
    error,
    setError,
    fileInputRef,
    onFileSelected: resolvePickedFile,
    importFromLibrary,
  };
}

export function extensionFromFile(file: globalThis.File): string {
  return inferVideoExtension(file.name, file.type);
}
