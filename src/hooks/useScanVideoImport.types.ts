import type { RefObject } from 'react';
import type { ScanCapture } from '../types/models';

export type UseScanVideoImportResult = {
  busy: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  importFromLibrary: () => Promise<ScanCapture | null>;
  importFromCamera?: () => Promise<ScanCapture | null>;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  onFileSelected?: (file: globalThis.File | null) => void;
};
