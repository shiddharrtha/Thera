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
