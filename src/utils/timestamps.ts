import { getLocales } from 'expo-localization';

/** Normalize epoch values that may be seconds or milliseconds. */
export function normalizeEpochMs(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return Date.now();
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

/** Device locale for formatting (falls back to system default). */
export function getDeviceLocale(): string | undefined {
  try {
    const locale = getLocales()[0]?.languageTag;
    if (locale) return locale;
  } catch {
    // ignore
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse a timestamp from storage/API into UTC epoch milliseconds.
 * Postgres `timestamptz` values without a suffix are treated as UTC.
 */
export function parseApiTimestamp(value: string | number): number {
  if (typeof value === 'number') {
    return normalizeEpochMs(value);
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return normalizeEpochMs(Number(trimmed));
  }

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed) || /[+-]\d{4}$/.test(trimmed)) {
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) return ms;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
    if (!Number.isNaN(ms)) return ms;
  }

  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/i.test(trimmed)) {
    const ms = Date.parse(`${trimmed}Z`);
    if (!Number.isNaN(ms)) return ms;
  }

  if (/^\d{4}-\d{2}-\d{2} [\d:.]+$/i.test(trimmed)) {
    const ms = Date.parse(`${trimmed.replace(' ', 'T')}Z`);
    if (!Number.isNaN(ms)) return ms;
  }

  const legacy = Date.parse(trimmed);
  if (!Number.isNaN(legacy)) return legacy;

  throw new Error(`Invalid timestamp: ${value}`);
}

/** Convert an instant to UTC ISO-8601 for database storage. */
export function toIsoTimestamp(value: number | string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(normalizeEpochMs(value)).toISOString();
  }

  return new Date(parseApiTimestamp(value)).toISOString();
}

/** Normalize expo-location timestamps for GPS track points. */
export function normalizeLocationTimestamp(raw: number): string {
  return toIsoTimestamp(raw);
}

/** Parse ISO or legacy strings into ISO for database storage. */
export function parseStoredTimestamp(value?: string): string | null {
  if (!value) return null;

  try {
    return toIsoTimestamp(value);
  } catch {
    return null;
  }
}

/** Format UTC epoch ms using the device clock + locale (no manual timezone math). */
export function formatFromEpochMs(ms: number): string {
  return new Date(ms).toLocaleString(getDeviceLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format UTC epoch ms as a short local date (e.g. "Jun 5"). */
export function formatDateFromEpochMs(ms: number): string {
  return new Date(ms).toLocaleString(getDeviceLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

/** Resolve the scan instant in epoch ms (recording start). */
export function getScanRecordedAtMs(scan: {
  recordedAtMs?: number;
  createdAt: string;
}): number {
  if (typeof scan.recordedAtMs === 'number' && Number.isFinite(scan.recordedAtMs)) {
    return scan.recordedAtMs;
  }

  return parseApiTimestamp(scan.createdAt);
}

/** Format when a scan was recorded (local device time). */
export function formatScanTimestamp(scan: {
  recordedAtMs?: number;
  createdAt: string;
}): string {
  return formatFromEpochMs(getScanRecordedAtMs(scan));
}

/** @deprecated Use formatScanTimestamp or formatFromEpochMs. */
export function getScanDisplayTimestamp(scan: {
  recordedAtMs?: number;
  createdAt: string;
}): string {
  return toIsoTimestamp(getScanRecordedAtMs(scan));
}

/** Format an optional stored ISO / epoch string for UI. */
export function formatOptionalDisplayDateTime(value?: string, fallback = 'No scans yet'): string {
  if (!value) return fallback;

  try {
    return formatFromEpochMs(parseApiTimestamp(value));
  } catch {
    return value;
  }
}

/** @deprecated Use formatOptionalDisplayDateTime. */
export function formatOptionalDisplayDate(iso?: string, fallback = 'No scans yet'): string {
  return formatOptionalDisplayDateTime(iso, fallback);
}

/** @deprecated Use formatFromEpochMs(parseApiTimestamp(iso)). */
export function formatDisplayDateTime(iso: string): string {
  return formatFromEpochMs(parseApiTimestamp(iso));
}

/** @deprecated Use formatDateFromEpochMs. */
export function formatDisplayDateShort(iso: string): string {
  return formatDateFromEpochMs(parseApiTimestamp(iso));
}

/** @deprecated Use formatDateFromEpochMs. */
export function formatDisplayDate(iso: string): string {
  return new Date(parseApiTimestamp(iso)).toLocaleString(getDeviceLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Recompute field last-scan ISO from completed scans. */
export function deriveFieldLastScanDate(
  fieldId: string,
  scans: { fieldId: string; status: string; createdAt: string; recordedAtMs?: number }[],
): string | undefined {
  const latest = scans
    .filter((scan) => scan.fieldId === fieldId && scan.status === 'completed')
    .sort((a, b) => getScanRecordedAtMs(b) - getScanRecordedAtMs(a))[0];

  if (!latest) return undefined;
  return toIsoTimestamp(getScanRecordedAtMs(latest));
}

/** Normalize cached field timestamps using scan history. */
export function normalizeFieldTimestamps<T extends { id: string; lastScanDate?: string }>(
  fields: T[],
  scans: { fieldId: string; status: string; createdAt: string; recordedAtMs?: number }[],
): T[] {
  return fields.map((field) => {
    const derived = deriveFieldLastScanDate(field.id, scans);
    return derived ? { ...field, lastScanDate: derived } : field;
  });
}

/** Format epoch ms the same way the app displays it (for verifying DB rows). */
export function formatRecordedAtMs(ms: number): string {
  return formatFromEpochMs(ms);
}
export function normalizeScanTimestamps<T extends { createdAt: string; recordedAtMs?: number }>(
  scans: T[],
): T[] {
  return scans.map((scan) => {
    if (typeof scan.recordedAtMs === 'number' && Number.isFinite(scan.recordedAtMs)) {
      return scan;
    }

    try {
      return { ...scan, recordedAtMs: parseApiTimestamp(scan.createdAt) };
    } catch {
      return scan;
    }
  });
}
