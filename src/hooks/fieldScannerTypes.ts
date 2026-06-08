import type { RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import type { GpsQuality } from './useNativeFieldScanner';

export type { GpsQuality, ScanPermissionStatus } from './useNativeFieldScanner';

export type FieldScanner = {
  isWeb: boolean;
  cameraRef: RefObject<CameraView | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  markCameraReady: () => void;
  permissionsGranted: boolean;
  permissionsLoading: boolean;
  permissionStatus: {
    camera: boolean;
    location: boolean;
    loading: boolean;
    canScan: boolean;
  };
  permissionMessage: string | null;
  requestPermissions: () => Promise<boolean>;
  requestLocationOnly: () => Promise<boolean>;
  openAppSettings: () => Promise<void>;
  isRecording: boolean;
  isStarting: boolean;
  isPaused: boolean;
  seconds: number;
  gpsQuality: GpsQuality;
  error: string | null;
  startRecording: () => Promise<boolean>;
  pauseRecording: () => Promise<void>;
  stopRecording: () => Promise<import('../types/models').ScanCapture | null>;
  resetScanner: () => void;
};
