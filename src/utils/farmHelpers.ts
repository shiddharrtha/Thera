import type { Farm, FarmProfile, Field, Report, Scan } from '../types/models';

export function farmFromProfile(profile: FarmProfile, id: string): Farm {
  return {
    id,
    name: profile.farmName.trim() || 'My Farm',
    region: profile.region,
    defaultCrop: profile.defaultCrop,
    units: profile.units,
    approximateAcres: profile.approximateAcres,
    createdAt: new Date().toISOString(),
  };
}

export function farmToProfile(farm: Farm): FarmProfile {
  return {
    farmName: farm.name,
    region: farm.region,
    defaultCrop: farm.defaultCrop,
    units: farm.units,
    approximateAcres: farm.approximateAcres,
  };
}

/** Fields without a farm_id still belong to the active farm until assigned elsewhere. */
export function fieldBelongsToFarm(field: Field, farmId: string | null | undefined): boolean {
  if (!farmId) return true;
  if (!field.farmId) return true;
  return field.farmId === farmId;
}

export function getFieldsForFarm(fields: Field[], farmId: string | null | undefined): Field[] {
  if (!farmId) return fields;
  return fields.filter((field) => fieldBelongsToFarm(field, farmId));
}

export function getFieldIdsForFarm(fields: Field[], farmId: string | null | undefined): Set<string> {
  return new Set(getFieldsForFarm(fields, farmId).map((field) => field.id));
}

export function getScansForFarm(scans: Scan[], fields: Field[], farmId: string | null | undefined): Scan[] {
  const fieldIds = getFieldIdsForFarm(fields, farmId);
  return scans.filter((scan) => fieldIds.has(scan.fieldId));
}

export function getReportsForFarm(
  reports: Report[],
  fields: Field[],
  farmId: string | null | undefined,
): Report[] {
  const fieldIds = getFieldIdsForFarm(fields, farmId);
  return reports.filter((report) => fieldIds.has(report.fieldId));
}

export function resolveSelectedFarmId(
  farms: Farm[],
  selectedFarmId: string | null | undefined,
): string | null {
  if (selectedFarmId && farms.some((farm) => farm.id === selectedFarmId)) {
    return selectedFarmId;
  }
  return farms[0]?.id ?? null;
}

export function getSelectedFarm(farms: Farm[], selectedFarmId: string | null | undefined): Farm | undefined {
  const id = resolveSelectedFarmId(farms, selectedFarmId);
  return id ? farms.find((farm) => farm.id === id) : undefined;
}

export function assignFieldsToFarm(fields: Field[], farmId: string): Field[] {
  return fields.map((field) => (field.farmId ? field : { ...field, farmId }));
}

export function ensureFieldFarmId(field: Field, farmId: string | null | undefined): Field {
  if (!farmId || field.farmId) return field;
  return { ...field, farmId };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(item.id, item);
  for (const item of remote) merged.set(item.id, item);
  return Array.from(merged.values());
}

/** Keep in-progress local scans while preferring remote completed scan rows. */
export function mergeScans(local: Scan[], remote: Scan[]): Scan[] {
  const merged = new Map<string, Scan>();
  for (const scan of remote) merged.set(scan.id, scan);
  for (const scan of local) {
    if (scan.status !== 'completed' || !merged.has(scan.id)) {
      merged.set(scan.id, scan);
    }
  }
  return Array.from(merged.values());
}

export function mergeReports(local: Report[], remote: Report[]): Report[] {
  return mergeById(local, remote);
}

/** Ensure field savings reflect the latest report totals. */
export function syncFieldSavingsFromReports(fields: Field[], reports: Report[]): Field[] {
  const latestReportByField = new Map<string, Report>();
  for (const report of reports) {
    const recordedAtMs = report.recordedAtMs ?? Date.parse(report.createdAt);
    const existing = latestReportByField.get(report.fieldId);
    const existingMs = existing?.recordedAtMs ?? (existing ? Date.parse(existing.createdAt) : 0);
    if (!existing || recordedAtMs >= existingMs) {
      latestReportByField.set(report.fieldId, report);
    }
  }

  return fields.map((field) => {
    const report = latestReportByField.get(field.id);
    if (!report) return field;
    return {
      ...field,
      totalSavings: Math.max(field.totalSavings, report.estimatedSavings),
      healthScore: field.healthScore ?? report.healthScore,
      openIssues: Math.max(field.openIssues, report.findingsCount),
      status: field.status === 'unscanned' ? report.severity : field.status,
    };
  });
}
