import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { readVideoBlob } from './readVideoBlob';

/** Append a local video to FormData for multipart upload. */
export async function appendVideoToFormData(
  formData: FormData,
  fieldName: string,
  localUri: string,
  fileName: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await readVideoBlob(localUri);
    formData.append(fieldName, blob, fileName);
    return;
  }

  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Scan video file was not found on this device.');
  }

  // Expo SDK 56 + expo/fetch expect an expo-file-system File, not { uri, type, name }.
  formData.append(fieldName, file);
}

/** Multipart upload to external HTTPS APIs (Railway) via standard fetch. */
export async function appendVideoForAnalysisUpload(
  formData: FormData,
  fieldName: string,
  localUri: string,
  fileName: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await readVideoBlob(localUri);
    formData.append(fieldName, blob, fileName);
    return;
  }

  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Scan video file was not found on this device.');
  }

  const mime = fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  // Standard RN fetch multipart — works with global fetch to Railway (expo/fetch + File does not).
  formData.append(
    fieldName,
    {
      uri: localUri,
      name: fileName,
      type: mime,
    } as unknown as Blob,
  );
}
