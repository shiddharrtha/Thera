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

export function getFieldsForFarm(fields: Field[], farmId: string | null | undefined): Field[] {
  if (!farmId) return [];
  return fields.filter((field) => field.farmId === farmId);
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
