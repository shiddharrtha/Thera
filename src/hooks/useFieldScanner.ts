import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import type { ScanCapture, GpsPoint } from '../types/models';
import { normalizeLocationTimestamp, toIsoTimestamp } from '../utils/timestamps';

export type GpsQuality = 'unknown' | 'good' | 'weak' | 'denied';

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

  const gpsTrackRef = useRef<GpsPoint[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingStartedAtMsRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const permissionsGranted =
    Boolean(cameraPermission?.granted) &&
    Boolean(micPermission?.granted) &&
    Boolean(locationPermission?.granted);

  const permissionsLoading =
    cameraPermission == null || micPermission == null || locationPermission == null;

  const requestPermissions = useCallback(async () => {
    setError(null);
    const [camera, mic, location] = await Promise.all([
      cameraPermission?.granted ? cameraPermission : requestCameraPermission(),
      micPermission?.granted ? micPermission : requestMicPermission(),
      locationPermission?.granted ? locationPermission : requestLocationPermission(),
    ]);

    if (!camera.granted || !mic.granted) {
      setError('Camera and microphone access are required to scan a field.');
      return false;
    }

    if (!location.granted) {
      setError('Location access is required to map scan results to your field.');
      return false;
    }

    return true;
  }, [
    cameraPermission,
    micPermission,
    locationPermission,
    requestCameraPermission,
    requestMicPermission,
    requestLocationPermission,
  ]);

  const stopLocationWatch = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  }, []);

  const startLocationWatch = useCallback(async () => {
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
  }, [stopLocationWatch]);

  const markCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  // Simulator / slow devices may never fire onCameraReady — unblock the record button.
  useEffect(() => {
    if (!permissionsGranted || cameraReady) return;

    const timeout = setTimeout(() => {
      setCameraReady(true);
      if (__DEV__) {
        console.warn('[scan] camera ready fallback triggered');
      }
    }, Platform.OS === 'ios' ? 2500 : 4000);

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
    if (!cameraRef.current) {
      setError('Camera is not available. Rebuild the app after installing expo-camera.');
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
      void startLocationWatch();

      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: 600,
      });

      recordingPromiseRef.current = recordingPromise;
      recordingStartedAtMsRef.current = Date.now();
      recordingPromise.catch((err) => {
        stopLocationWatch();
        setIsRecording(false);
        setIsStarting(false);
        setError(err instanceof Error ? err.message : 'Recording failed to start.');
        recordingPromiseRef.current = null;
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
  }, [cameraReady, isRecording, isStarting, startLocationWatch, stopLocationWatch]);

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

    setError(null);
    cameraRef.current.stopRecording();

    try {
      const result = await recordingPromiseRef.current;
      stopLocationWatch();
      setIsRecording(false);
      setIsPaused(false);

      if (!result?.uri) {
        setError('Recording failed — no video was saved.');
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
  }, [stopLocationWatch]);

  // Cleanup only when the scanner unmounts — not when isRecording toggles.
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

  return {
    cameraRef,
    cameraReady,
    markCameraReady,
    permissionsGranted,
    permissionsLoading,
    requestPermissions,
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
