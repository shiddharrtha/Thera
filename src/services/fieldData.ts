import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { AuthUser } from './auth';
import type { DetectedIssue, Field, FieldStatus, GpsPoint, Report, Scan } from '../types/models';
import { parseStoredTimestamp, parseApiTimestamp, toIsoTimestamp } from '../utils/timestamps';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshFirebaseToken(force = true) {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
}

async function withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [0, 1500, 3000, 5000, 8000];
  let lastError: unknown;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    await refreshFirebaseToken(true);

    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[fieldData] operation failed', error);
      }
    }
  }

  throw lastError ?? new Error('Could not complete field data operation.');
}

function normalizeGpsTrack(track?: GpsPoint[] | null): GpsPoint[] | null {
  if (!track?.length) return track ?? null;

  return track.map((point) => ({
    ...point,
    timestamp: toIsoTimestamp(point.timestamp),
  }));
}

function scanRecordingMs(scan: Scan): number {
  if (typeof scan.recordedAtMs === 'number' && Number.isFinite(scan.recordedAtMs)) {
    return scan.recordedAtMs;
  }
  return parseApiTimestamp(scan.createdAt);
}

function reportRecordingMs(report: Report): number {
  if (typeof report.recordedAtMs === 'number' && Number.isFinite(report.recordedAtMs)) {
    return report.recordedAtMs;
  }
  return parseApiTimestamp(report.createdAt);
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

function parseLastScanAt(lastScanDate?: string): string | null {
  return parseStoredTimestamp(lastScanDate);
}

type FieldRow = {
  id: string;
  user_id: string;
  name: string;
  crop_type: string;
  acreage: number;
  planting_date: string | null;
  location: string | null;
  has_boundary: boolean;
  health_score: number | null;
  open_issues: number;
  total_savings: number;
  last_scan_at: string | null;
  status: FieldStatus;
};

type ScanRow = {
  id: string;
  field_id: string;
  user_id: string;
  status: Scan['status'];
  progress: number;
  weed_coverage: number | null;
  stress_coverage: number | null;
  health_score: number | null;
  is_first_scan: boolean;
  created_at: string;
  completed_at: string | null;
  recorded_at_ms: number | null;
  video_url: string | null;
  video_duration_seconds: number | null;
  gps_track: GpsPoint[] | null;
};

type ReportRow = {
  id: string;
  scan_id: string;
  field_id: string;
  user_id: string;
  summary: string;
  recommended_spray_acres: number;
  estimated_savings: number;
  chemical_reduction_percent: number;
  health_score: number;
  severity: FieldStatus;
  findings_count: number;
  issues: DetectedIssue[];
  created_at: string;
  recorded_at_ms: number | null;
};

function rowToField(row: FieldRow): Field {
  return {
    id: row.id,
    name: row.name,
    cropType: row.crop_type,
    acreage: Number(row.acreage),
    plantingDate: row.planting_date ?? undefined,
    location: row.location ?? undefined,
    hasBoundary: row.has_boundary,
    healthScore: row.health_score ?? undefined,
    openIssues: row.open_issues,
    totalSavings: Number(row.total_savings),
    lastScanDate: row.last_scan_at ?? undefined,
    status: row.status,
  };
}

function fieldToRow(field: Field, userId: string): FieldRow {
  return {
    id: field.id,
    user_id: userId,
    name: field.name,
    crop_type: field.cropType,
    acreage: field.acreage,
    planting_date: field.plantingDate ?? null,
    location: field.location ?? null,
    has_boundary: field.hasBoundary,
    health_score: field.healthScore ?? null,
    open_issues: field.openIssues,
    total_savings: field.totalSavings,
    last_scan_at: parseLastScanAt(field.lastScanDate),
    status: field.status,
  };
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseGpsTrack(track: unknown): GpsPoint[] | null {
  if (!track) return null;
  if (typeof track === 'string') {
    try {
      return parseGpsTrack(JSON.parse(track));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(track)) return null;
  return normalizeGpsTrack(track as GpsPoint[]);
}

function rowToScan(row: ScanRow): Scan {
  const recordedAtMs = row.recorded_at_ms ?? parseApiTimestamp(row.created_at);
  return {
    id: row.id,
    fieldId: row.field_id,
    createdAt: msToIso(recordedAtMs),
    recordedAtMs,
    completedAt: row.completed_at ? toIsoTimestamp(row.completed_at) : undefined,
    status: row.status,
    progress: row.progress,
    weedCoverage: parseOptionalNumber(row.weed_coverage),
    stressCoverage: parseOptionalNumber(row.stress_coverage),
    healthScore: parseOptionalNumber(row.health_score),
    isFirstScan: row.is_first_scan,
    videoUrl: row.video_url ?? undefined,
    videoDurationSeconds: parseOptionalNumber(row.video_duration_seconds),
    gpsTrack: parseGpsTrack(row.gps_track) ?? undefined,
  };
}

function scanToRow(scan: Scan, userId: string): ScanRow {
  const recordedAtMs = scanRecordingMs(scan);
  return {
    id: scan.id,
    field_id: scan.fieldId,
    user_id: userId,
    status: scan.status,
    progress: scan.progress,
    weed_coverage: scan.weedCoverage ?? null,
    stress_coverage: scan.stressCoverage ?? null,
    health_score: scan.healthScore ?? null,
    is_first_scan: scan.isFirstScan,
    created_at: msToIso(recordedAtMs),
    recorded_at_ms: recordedAtMs,
    completed_at: scan.completedAt
      ? toIsoTimestamp(scan.completedAt)
      : null,
    video_url: scan.videoUrl ?? null,
    video_duration_seconds: scan.videoDurationSeconds ?? null,
    gps_track: normalizeGpsTrack(scan.gpsTrack),
  };
}

function rowToReport(row: ReportRow): Report {
  const recordedAtMs = row.recorded_at_ms ?? parseApiTimestamp(row.created_at);
  return {
    id: row.id,
    scanId: row.scan_id,
    fieldId: row.field_id,
    createdAt: msToIso(recordedAtMs),
    recordedAtMs,
    summary: row.summary,
    recommendedSprayAcres: Number(row.recommended_spray_acres),
    estimatedSavings: Number(row.estimated_savings),
    chemicalReductionPercent: Number(row.chemical_reduction_percent),
    healthScore: Number(row.health_score),
    severity: row.severity,
    findingsCount: row.findings_count,
    issues: row.issues ?? [],
  };
}

function reportToRow(report: Report, userId: string): ReportRow {
  const recordedAtMs = reportRecordingMs(report);
  return {
    id: report.id,
    scan_id: report.scanId,
    field_id: report.fieldId,
    user_id: userId,
    summary: report.summary,
    recommended_spray_acres: report.recommendedSprayAcres,
    estimated_savings: report.estimatedSavings,
    chemical_reduction_percent: report.chemicalReductionPercent,
    health_score: report.healthScore,
    severity: report.severity,
    findings_count: report.findingsCount,
    issues: report.issues,
    created_at: msToIso(recordedAtMs),
    recorded_at_ms: recordedAtMs,
  };
}

export function getFieldDataErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not save field data.';

  if (code === 'PGRST205' || code === '42P01' || /fields|scans|reports|video_url|recorded_at_ms/i.test(message)) {
    return 'Field tables are missing in Supabase. Run: npm run db:migrate-fields-scans (add SUPABASE_DB_URL to .env first).';
  }

  if (code === '42501') {
    return 'Database permissions blocked the save. Run supabase/add-fields-scans-tables.sql in Supabase.';
  }

  if (code === 'PGRST301') {
    return 'Could not authenticate with Supabase. Check Firebase is linked in Supabase settings.';
  }

  return message;
}

/** Load all fields, scans, and reports for a user from Supabase. */
export async function fetchFieldData(userId: string): Promise<{
  fields: Field[];
  scans: Scan[];
  reports: Report[];
}> {
  const [fieldsResult, scansResult, reportsResult] = await Promise.all([
    supabase.from('fields').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true }),
    supabase.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  if (fieldsResult.error) throw fieldsResult.error;
  if (scansResult.error) throw scansResult.error;
  if (reportsResult.error) throw reportsResult.error;

  return {
    fields: (fieldsResult.data as FieldRow[]).map(rowToField),
    scans: (scansResult.data as ScanRow[]).map(rowToScan),
    reports: (reportsResult.data as ReportRow[]).map(rowToReport),
  };
}

/** Insert a new field for the signed-in user. */
export async function createField(user: AuthUser, field: Field) {
  return withAuthRetry(async () => {
    const row = fieldToRow(field, user.uid);
    const { data, error } = await supabase.from('fields').insert(row).select('*').single();
    if (error) throw error;
    return rowToField(data as FieldRow);
  });
}

/** Update an existing field row. */
export async function updateField(userId: string, field: Field) {
  return withAuthRetry(async () => {
    const row = fieldToRow(field, userId);
    const { data, error } = await supabase
      .from('fields')
      .update({
        name: row.name,
        crop_type: row.crop_type,
        acreage: row.acreage,
        planting_date: row.planting_date,
        location: row.location,
        has_boundary: row.has_boundary,
        health_score: row.health_score,
        open_issues: row.open_issues,
        total_savings: row.total_savings,
        last_scan_at: row.last_scan_at,
        status: row.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', field.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return rowToField(data as FieldRow);
  });
}

/** Insert a new scan. */
export async function createScan(userId: string, scan: Scan) {
  return withAuthRetry(async () => {
    const row = scanToRow(scan, userId);
    const { data, error } = await supabase.from('scans').insert(row).select('*').single();
    if (error) throw error;
    return rowToScan(data as ScanRow);
  });
}

/** Update scan progress and status. */
export async function updateScan(userId: string, scan: Scan) {
  return withAuthRetry(async () => {
    const row = scanToRow(scan, userId);
    const updatePayload: Record<string, unknown> = {
      status: row.status,
      progress: row.progress,
      weed_coverage: row.weed_coverage,
      stress_coverage: row.stress_coverage,
      health_score: row.health_score,
      video_url: row.video_url,
      video_duration_seconds: row.video_duration_seconds,
      gps_track: row.gps_track,
    };

    if (scan.completedAt) {
      updatePayload.completed_at = toIsoTimestamp(scan.completedAt);
    }

    const { data, error } = await supabase
      .from('scans')
      .update(updatePayload)
      .eq('id', scan.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return rowToScan(data as ScanRow);
  });
}

/** Insert a report after scan completion. */
export async function createReport(userId: string, report: Report) {
  return withAuthRetry(async () => {
    const row = reportToRow(report, userId);
    const { data, error } = await supabase.from('reports').insert(row).select('*').single();
    if (error) throw error;
    return rowToReport(data as ReportRow);
  });
}

/** Persist scan completion: insert completed scan, report, and update field. */
export async function completeScanRemote(
  userId: string,
  scan: Scan,
  report: Report,
  field: Field,
) {
  await createScan(userId, scan);
  await createReport(userId, report);
  await withAuthRetry(async () => {
    const row = fieldToRow(field, userId);
    const { error } = await supabase
      .from('fields')
      .update({
        health_score: row.health_score,
        open_issues: row.open_issues,
        total_savings: row.total_savings,
        last_scan_at: msToIso(scanRecordingMs(scan)),
        status: row.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', field.id)
      .eq('user_id', userId);
    if (error) throw error;
  });
}

/** Push locally stored fields/scans/reports to Supabase (one-time migration). */
export async function migrateLocalFieldData(
  user: AuthUser,
  local: { fields: Field[]; scans: Scan[]; reports: Report[] },
) {
  if (local.fields.length === 0) return;

  await withAuthRetry(async () => {
    const fieldRows = local.fields.map((field) => fieldToRow(field, user.uid));
    const { error: fieldsError } = await supabase.from('fields').upsert(fieldRows, { onConflict: 'id' });
    if (fieldsError) throw fieldsError;

    const completedScans = local.scans.filter((scan) => scan.status === 'completed');
    if (completedScans.length > 0) {
      const scanRows = completedScans.map((scan) => scanToRow(scan, user.uid));
      const { error: scansError } = await supabase.from('scans').upsert(scanRows, { onConflict: 'id' });
      if (scansError) throw scansError;
    }

    if (local.reports.length > 0) {
      const reportRows = local.reports.map((report) => reportToRow(report, user.uid));
      const { error: reportsError } = await supabase.from('reports').upsert(reportRows, { onConflict: 'id' });
      if (reportsError) throw reportsError;
    }
  });
}
