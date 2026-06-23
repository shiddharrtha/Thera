import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { ScanCapture } from '../types/models';
import { toIsoTimestamp } from '../utils/timestamps';
import {
  persistScanVideoAsMp4,
  validateScanDuration,
} from '../utils/normalizeScanVideo';
import type { UseScanVideoImportResult } from './useScanVideoImport.types';

export type ScanVideoImportSource = 'library' | 'camera';

function durationSecondsFromPickerAsset(
  durationMs: number | null | undefined,
  fallbackSeconds = 0,
): number {
  if (durationMs != null && Number.isFinite(durationMs) && durationMs > 0) {
    return Math.max(1, Math.round(durationMs / 1000));
  }
  return fallbackSeconds;
}

async function buildCaptureFromUri(
  uri: string,
  durationSeconds: number,
  mimeType?: string | null,
): Promise<ScanCapture> {
  const normalized = await persistScanVideoAsMp4(uri, {
    mimeType,
    durationSeconds,
  });

  const resolvedDuration = normalized.durationSeconds || durationSeconds;
  validateScanDuration(resolvedDuration);

  const recordedEndAtMs = Date.now();
  const recordedAtMs = recordedEndAtMs - resolvedDuration * 1000;

  return {
    videoUri: normalized.videoUri,
    durationSeconds: resolvedDuration,
    gpsTrack: [],
    recordedAtMs,
    recordedEndAtMs,
    recordedAt: toIsoTimestamp(recordedAtMs),
    recordedEndAt: toIsoTimestamp(recordedEndAtMs),
    videoExtension: 'mp4',
    videoMimeType: 'video/mp4',
  };
}

export function useScanVideoImport(): UseScanVideoImportResult {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureMediaLibraryPermission = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library access is required to import a scan video.');
    }
  }, []);

  const ensureCameraPermission = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera access is required to record a scan video.');
    }
  }, []);

  const importFromNativeSource = useCallback(
    async (source: ScanVideoImportSource): Promise<ScanCapture | null> => {
      if (source === 'library') {
        await ensureMediaLibraryPermission();
      } else {
        await ensureCameraPermission();
      }

      const launcher =
        source === 'library'
          ? ImagePicker.launchImageLibraryAsync
          : ImagePicker.launchCameraAsync;

      const result = await launcher({
        mediaTypes: ['videos'],
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return null;
      }

      const asset = result.assets[0];
      const durationSeconds = durationSecondsFromPickerAsset(asset.duration);
      return buildCaptureFromUri(asset.uri, durationSeconds, asset.mimeType ?? 'video/mp4');
    },
    [ensureCameraPermission, ensureMediaLibraryPermission],
  );

  const runImport = useCallback(async (task: () => Promise<ScanCapture | null>) => {
    setError(null);
    setBusy(true);
    try {
      return await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import video.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const importFromLibrary = useCallback(
    () => runImport(() => importFromNativeSource('library')),
    [importFromNativeSource, runImport],
  );

  const importFromCamera = useCallback(
    () => runImport(() => importFromNativeSource('camera')),
    [importFromNativeSource, runImport],
  );

  return {
    busy,
    error,
    setError,
    importFromLibrary,
    importFromCamera,
  };
}
