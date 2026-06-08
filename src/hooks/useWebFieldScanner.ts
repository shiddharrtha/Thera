import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { ScanCapture, GpsPoint } from '../types/models';
import { normalizeLocationTimestamp, toIsoTimestamp } from '../utils/timestamps';
import type { FieldScanner } from './fieldScannerTypes';
import type { GpsQuality } from './useNativeFieldScanner';

const MIN_RECORDING_SECONDS = 3;

function pickRecorderMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

export function useWebFieldScanner(): FieldScanner {
  const cameraRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('video/webm');
  const blobUrlRef = useRef<string | null>(null);
  const recordingStartedAtMsRef = useRef<number | null>(null);
  const gpsTrackRef = useRef<GpsPoint[]>([]);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const isRecordingRef = useRef(false);
  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [locationPermission] = Location.useForegroundPermissions();
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gpsQuality, setGpsQuality] = useState<GpsQuality>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const locationGranted = Boolean(locationPermission?.granted);
  const permissionsLoading = locationPermission == null;

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    try {
      await el.play();
    } catch {
      // Autoplay policies may require a user gesture first.
    }
  }, []);

  const ensurePreviewStream = useCallback(async (): Promise<MediaStream> => {
    if (previewStreamRef.current) {
      await attachStreamToVideo(previewStreamRef.current);
      return previewStreamRef.current;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera access.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    previewStreamRef.current = stream;
    setCameraGranted(true);
    setCameraReady(true);
    await attachStreamToVideo(stream);
    return stream;
  }, [attachStreamToVideo]);

  const openAppSettings = useCallback(async () => {
    setPermissionMessage(
      'Use your browser site settings (lock icon in the address bar) to allow Camera and Location for this site.',
    );
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setError(null);
    setPermissionMessage(null);

    try {
      await ensurePreviewStream();
    } catch (err) {
      setPermissionMessage(
        err instanceof Error
          ? err.message
          : 'Camera access was denied. Allow camera when your browser prompts you.',
      );
      return false;
    }

    const location = locationPermission?.granted
      ? locationPermission
      : await Location.requestForegroundPermissionsAsync();
    if (!location.granted) {
      setPermissionMessage(
        'Location is recommended for GPS mapping. Allow location when your browser prompts you.',
      );
    }

    return true;
  }, [ensurePreviewStream, locationPermission]);

  const requestLocationOnly = useCallback(async (): Promise<boolean> => {
    setPermissionMessage(null);
    const location = locationPermission?.granted
      ? locationPermission
      : await Location.requestForegroundPermissionsAsync();
    if (!location.granted) {
      setPermissionMessage('Location access was not granted.');
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
          gpsTrackRef.current.push({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: normalizeLocationTimestamp(location.timestamp),
            accuracy: location.coords.accuracy ?? undefined,
          });

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
    } catch {
      setGpsQuality('denied');
    }
  }, [locationGranted, stopLocationWatch]);

  const markCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  useEffect(() => {
    if (!cameraGranted || !previewStreamRef.current) return;
    void attachStreamToVideo(previewStreamRef.current);
  }, [cameraGranted, attachStreamToVideo]);

  const startRecording = useCallback(async () => {
    if (isRecording || isStarting) return false;

    setError(null);
    setIsStarting(true);
    secondsRef.current = 0;
    setSeconds(0);
    setIsPaused(false);

    try {
      const stream = await ensurePreviewStream();

      if (!locationGranted) {
        void requestLocationOnly();
      } else {
        void startLocationWatch();
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('This browser does not support video recording.');
      }

      mimeTypeRef.current = pickRecorderMimeType();
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError('Browser recording failed. Try Chrome or Safari on your phone.');
      };

      recorder.start(1000);
      recordingStartedAtMsRef.current = Date.now();
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
    ensurePreviewStream,
    isRecording,
    isStarting,
    locationGranted,
    requestLocationOnly,
    startLocationWatch,
    stopLocationWatch,
  ]);

  const pauseRecording = useCallback(async () => {
    if (!isRecording) return;
    const recorder = recorderRef.current;
    if (!recorder) return;

    if (recorder.state === 'recording' && typeof recorder.pause === 'function') {
      recorder.pause();
      setIsPaused(true);
      return;
    }
    if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
      recorder.resume();
      setIsPaused(false);
    }
  }, [isRecording]);

  const stopRecording = useCallback(async (): Promise<ScanCapture | null> => {
    if (!isRecording) return null;

    if (secondsRef.current < MIN_RECORDING_SECONDS) {
      setError(`Keep recording for at least ${MIN_RECORDING_SECONDS} seconds before stopping.`);
      return null;
    }

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setError('Recording did not start. Try again.');
      setIsRecording(false);
      return null;
    }

    setError(null);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        stopLocationWatch();
        setIsRecording(false);
        setIsPaused(false);
        recorderRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        if (blob.size === 0) {
          setError('Recording failed — no video data was captured. Record for 5+ seconds and try again.');
          resolve(null);
          return;
        }

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const uri = URL.createObjectURL(blob);
        blobUrlRef.current = uri;

        const recordedAtMs = recordingStartedAtMsRef.current ?? Date.now();
        const recordedEndAtMs = Date.now();
        const ext = extensionForMime(mimeTypeRef.current);

        resolve({
          videoUri: uri,
          durationSeconds: secondsRef.current,
          gpsTrack: [...gpsTrackRef.current],
          recordedAtMs,
          recordedEndAtMs,
          recordedAt: toIsoTimestamp(recordedAtMs),
          recordedEndAt: toIsoTimestamp(recordedEndAtMs),
          videoMimeType: mimeTypeRef.current,
          videoExtension: ext,
        } satisfies ScanCapture);
      };

      try {
        if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
          recorder.resume();
        }
        recorder.stop();
      } catch (err) {
        setIsRecording(false);
        setError(err instanceof Error ? err.message : 'Could not stop recording.');
        resolve(null);
      }
    });
  }, [isRecording, stopLocationWatch]);

  const resetScanner = useCallback(() => {
    stopLocationWatch();
    if (timerRef.current) clearInterval(timerRef.current);

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];

    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    recordingStartedAtMsRef.current = null;
    gpsTrackRef.current = [];
    secondsRef.current = 0;
    setSeconds(0);
    setIsRecording(false);
    setIsStarting(false);
    setIsPaused(false);
    setCameraReady(false);
    setCameraGranted(false);
    setGpsQuality('unknown');
    setError(null);
    setPermissionMessage(null);
  }, [stopLocationWatch]);

  useEffect(() => {
    return () => {
      stopLocationWatch();
      if (timerRef.current) clearInterval(timerRef.current);
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
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
    isWeb: true,
    cameraRef,
    videoRef,
    cameraReady,
    markCameraReady,
    permissionsGranted: cameraGranted,
    permissionsLoading,
    permissionStatus: {
      camera: cameraGranted,
      location: locationGranted,
      loading: permissionsLoading,
      canScan: cameraGranted,
    },
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
