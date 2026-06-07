/** Abort/cancel errors compatible with React Native (no DOMException). */
export function createAbortError(message = 'Scan cancelled.'): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  return error instanceof Error && error.message === 'Scan cancelled.';
}
