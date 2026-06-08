/** In-memory web scan videos — blob URLs are revoked when ScanScreen unmounts. */

const cache = new Map<string, Blob>();

export function cacheWebVideoBlob(uri: string, blob: Blob): void {
  cache.set(uri, blob);
}

export function getWebVideoBlob(uri: string): Blob | undefined {
  return cache.get(uri);
}

export function releaseWebVideoBlob(uri: string): void {
  cache.delete(uri);
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // ignore
    }
  }
}
