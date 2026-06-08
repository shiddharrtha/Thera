import { File } from 'expo-file-system';

/** Read a local scan video as a Blob (web fallback path). */
export async function readVideoBlob(localUri: string): Promise<Blob> {
  if (localUri.startsWith('blob:') || localUri.startsWith('http')) {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error('Scan video could not be read from browser storage.');
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Recorded scan video was empty.');
    }
    return blob.type ? blob : new Blob([blob], { type: 'video/webm' });
  }

  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Scan video file was not found on this device.');
  }

  try {
    const response = await fetch(localUri);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) {
        return blob.type ? blob : new Blob([blob], { type: 'video/mp4' });
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[readVideoBlob] fetch(localUri) failed, falling back to bytes()', error);
    }
  }

  const bytes = await file.bytes();
  return new Blob([bytes], { type: 'video/mp4' });
}
