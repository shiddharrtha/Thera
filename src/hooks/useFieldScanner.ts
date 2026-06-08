import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import type { ScanCapture, GpsPoint } from '../types/models';
import { normalizeLocationTimestamp, toIsoTimestamp } from '../utils/timestamps';

export type GpsQuality = 'unknown' | 'good' | 'weak' | 'denied';

export type ScanPermissionStatus = {
  camera: boolean;
  location: boolean;
  loading: boolean;
  /** True when camera is granted — enough to open the scanner. */
  canScan: boolean;
};

/** expo-camera often returns no URI if stopRecording runs before frames are captured. */
const MIN_RECORDING_SECONDS = 3;
/** iOS needs time after mode="video" before recordAsync produces frames. */
const CAMERA_WARMUP_MS = Platform.OS === 'ios' ? 900 : 500;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useFieldScanner() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gpsQuality, setGpsQuality] = useState<GpsQuality>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const gpsTrackRef = useRef<GpsPoint[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingErrorRef = useRef<string | null>(null);
  const recordingStartedAtMsRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const cameraGranted = Boolean(cameraPermission?.granted);
  const locationGranted = Boolean(locationPermission?.granted);
  const permissionsLoading = cameraPermission == null || locationPermission == null;
  const canScan = cameraGranted;
  const permissionsGranted = cameraGranted;

  const openAppSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  /** Request camera first, then location — parallel prompts suppress iOS location dialog. */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Field scanning requires the Thera iPhone app. It does not work in the browser.');
      return false;
    }

    setError(null);
    setPermissionMessage(null);

    const camera = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!camera.granted) {
      setPermissionMessage(
        camera.canAskAgain
          ? 'Camera access is required. Tap below to allow camera access.'
          : 'Camera access is blocked. Open Settings → Thera → Camera and turn it on.',
      );
      return false;
    }

    void (micPermission?.granted ? micPermission : requestMicPermission());

    const location = locationPermission?.granted
      ? locationPermission
      : await Location.requestForegroundPermissionsAsync();
    if (!location.granted) {
      setPermissionMessage(
        location.canAskAgain
          ? 'Location helps map scan results to your field. Tap below to allow location while using the app.'
          : 'Location is blocked. Open Settings → Thera → Location → While Using the App.',
      );
      // Camera is enough to scan; GPS will stay empty until location is granted.
    }

    return true;
  }, [
    cameraPermission,
    micPermission,
    locationPermission,
    requestCameraPermission,
    requestMicPermission,
  ]);

  const requestLocationOnly = useCallback(async (): Promise<boolean> => {
    setPermissionMessage(null);
    const location = locationPermission?.granted
      ? locationPermission
      : await Location.requestForegroundPermissionsAsync();
    if (!location.granted) {
      setPermissionMessage(
        location.canAskAgain
          ? 'Location access was not granted.'
          : 'Location is blocked in Settings. Open Settings → Thera → Location.',
      );
      return false;
    }
    return true;
  }, [locationPermission]);

  const stopLocationWatch = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  }, []);

  const startLocationWatch = useCallback(async () => {
    if (!locationGranted) {
      setGpsQuality('denied');
      return;
    }

    stopLocationWatch();
    gpsTrackRef.current = [];

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const point: GpsPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: normalizeLocationTimestamp(location.timestamp),
            accuracy: location.coords.accuracy ?? undefined,
          };
          gpsTrackRef.current.push(point);

          const accuracy = location.coords.accuracy;
          if (accuracy == null) {
            setGpsQuality('unknown');
          } else if (accuracy <= 20) {
            setGpsQuality('good');
          } else {
            setGpsQuality('weak');
          }
        },
      );

      locationSubRef.current = subscription;
    } catch (err) {
      if (__DEV__) {
        console.warn('[scan] location watch failed', err);
      }
      setGpsQuality('denied');
    }
  }, [locationGranted, stopLocationWatch]);

  const markCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  // Simulator may never fire onCameraReady — unblock the record button there only.
  useEffect(() => {
    if (!permissionsGranted || cameraReady) return;
    if (Constants.isDevice) return;

    const timeout = setTimeout(() => {
      setCameraReady(true);
      if (__DEV__) {
        console.warn('[scan] camera ready fallback triggered (simulator)');
      }
    }, Platform.OS === 'ios' ? 2500 : 4000);

    return () => clearTimeout(timeout);
  }, [permissionsGranted, cameraReady]);

  // Real devices: some builds never fire onCameraReady — use a generous fallback.
  useEffect(() => {
    if (!permissionsGranted || cameraReady || !Constants.isDevice) return;

    const timeout = setTimeout(() => {
      setCameraReady(true);
      if (__DEV__) {
        console.warn('[scan] camera ready fallback triggered (device)');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [permissionsGranted, cameraReady]);

  const persistRecording = useCallback(async (
    tempUri: string,
    durationSeconds: number,
    recordedAtMs: number,
    recordedEndAtMs: number,
  ) => {
    const scansDir = new Directory(Paths.document, 'scans');
    if (!scansDir.exists) {
      scansDir.create({ idempotent: true });
    }

    const destFile = new File(scansDir, `scan_${Date.now()}.mp4`);
    const sourceFile = new File(tempUri);
    if (!sourceFile.exists) {
      throw new Error('Recorded video file was missing from device storage.');
    }
    await sourceFile.copy(destFile);

    return {
      videoUri: destFile.uri,
      durationSeconds,
      gpsTrack: [...gpsTrackRef.current],
      recordedAtMs,
      recordedEndAtMs,
      recordedAt: toIsoTimestamp(recordedAtMs),
      recordedEndAt: toIsoTimestamp(recordedEndAtMs),
    } satisfies ScanCapture;
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Field scanning requires the Thera iPhone app.');
      return false;
    }

    if (!cameraRef.current) {
      setError('Camera is not available. Rebuild the app: npm run ios');
      return false;
    }

    if (!cameraReady) {
      setError('Camera is still starting. Wait a second and try again.');
      return false;
    }

    if (isRecording || isStarting) return false;

    setError(null);
    setIsStarting(true);
    secondsRef.current = 0;
    setSeconds(0);
    setIsPaused(false);

    try {
      if (!locationGranted) {
        void requestLocationOnly();
      } else {
        void startLocationWatch();
      }

      await delay(CAMERA_WARMUP_MS);

      if (!cameraRef.current) {
        throw new Error('Camera is not available.');
      }

      recordingErrorRef.current = null;
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: 600,
      });

      recordingPromiseRef.current = recordingPromise;
      recordingStartedAtMsRef.current = Date.now();
      recordingPromise.catch((err) => {
        recordingErrorRef.current =
          err instanceof Error ? err.message : 'Recording failed to start.';
        stopLocationWatch();
        setIsRecording(false);
        setIsStarting(false);
        setError(recordingErrorRef.current);
        recordingPromiseRef.current = null;
        if (__DEV__) {
          console.warn('[scan] recordAsync rejected', err);
        }
      });

      setIsRecording(true);
      setIsStarting(false);
      return true;
    } catch (err) {
      stopLocationWatch();
      setIsRecording(false);
      setIsStarting(false);
      setError(err instanceof Error ? err.message : 'Could not start recording.');
      return false;
    }
  }, [
    cameraReady,
    isRecording,
    isStarting,
    locationGranted,
    requestLocationOnly,
    startLocationWatch,
    stopLocationWatch,
  ]);

  const pauseRecording = useCallback(async () => {
    if (!isRecording) return;

    try {
      const features = cameraRef.current?.getSupportedFeatures();
      if (features?.toggleRecordingAsyncAvailable) {
        await cameraRef.current?.toggleRecordingAsync();
        setIsPaused((prev) => !prev);
        return;
      }
    } catch {
      // Fall back to timer-only pause on unsupported devices.
    }

    setIsPaused((prev) => !prev);
  }, [isRecording]);

  const stopRecording = useCallback(async (): Promise<ScanCapture | null> => {
    if (!cameraRef.current || !isRecording) return null;

    if (secondsRef.current < MIN_RECORDING_SECONDS) {
      setError(
        `Keep recording for at least ${MIN_RECORDING_SECONDS} seconds before stopping.`,
      );
      return null;
    }

    setError(null);
    const activePromise = recordingPromiseRef.current;
    if (!activePromise) {
      setError('Recording did not start. Try again.');
      setIsRecording(false);
      return null;
    }

    cameraRef.current.stopRecording();
    if (Platform.OS === 'ios') {
      await delay(200);
      cameraRef.current.stopRecording();
    }

    try {
      const result = await activePromise;
      stopLocationWatch();
      setIsRecording(false);
      setIsPaused(false);

      if (!result?.uri) {
        const detail = recordingErrorRef.current;
        setError(
          detail
            ? `Recording failed: ${detail}`
            : Platform.OS === 'web'
              ? 'Video recording is not supported in the browser. Use the iPhone app.'
              : 'Recording failed — no video was saved. Rebuild the dev app (npm run ios), then record 5+ seconds before stopping.',
        );
        return null;
      }

      const durationSeconds = secondsRef.current;
      const recordedAtMs = recordingStartedAtMsRef.current ?? Date.now();
      const recordedEndAtMs = Date.now();
      return await persistRecording(result.uri, durationSeconds, recordedAtMs, recordedEndAtMs);
    } catch (err) {
      stopLocationWatch();
      setIsRecording(false);
      setIsPaused(false);
      setError(err instanceof Error ? err.message : 'Could not save the recording.');
      return null;
    } finally {
      recordingPromiseRef.current = null;
    }
  }, [isRecording, persistRecording, stopLocationWatch]);

  const resetScanner = useCallback(() => {
    stopLocationWatch();
    if (timerRef.current) clearInterval(timerRef.current);
    if (cameraRef.current && isRecordingRef.current) {
      cameraRef.current.stopRecording();
    }
    recordingPromiseRef.current = null;
    recordingErrorRef.current = null;
    recordingStartedAtMsRef.current = null;
    gpsTrackRef.current = [];
    secondsRef.current = 0;
    setSeconds(0);
    setIsRecording(false);
    setIsStarting(false);
    setIsPaused(false);
    setCameraReady(false);
    setGpsQuality('unknown');
    setError(null);
    setPermissionMessage(null);
  }, [stopLocationWatch]);

  useEffect(() => {
    return () => {
      stopLocationWatch();
      if (timerRef.current) clearInterval(timerRef.current);
      if (cameraRef.current && isRecordingRef.current) {
        cameraRef.current.stopRecording();
      }
    };
  }, [stopLocationWatch]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const permissionStatus: ScanPermissionStatus = {
    camera: cameraGranted,
    location: locationGranted,
    loading: permissionsLoading,
    canScan,
  };

  return {
    cameraRef,
    cameraReady,
    markCameraReady,
    permissionsGranted,
    permissionsLoading,
    permissionStatus,
    permissionMessage,
    requestPermissions,
    requestLocationOnly,
    openAppSettings,
    isRecording,
    isStarting,
    isPaused,
    seconds,
    gpsQuality,
    error,
    startRecording,
    pauseRecording,
    stopRecording,
    resetScanner,
  };
}
