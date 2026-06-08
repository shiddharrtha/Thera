import { Platform } from 'react-native';
import { useNativeFieldScanner } from './useNativeFieldScanner';
import { useWebFieldScanner } from './useWebFieldScanner';

export type { GpsQuality, ScanPermissionStatus } from './useNativeFieldScanner';
export type { FieldScanner } from './fieldScannerTypes';

export function useFieldScanner() {
  if (Platform.OS === 'web') {
    return useWebFieldScanner();
  }
  return useNativeFieldScanner();
}
