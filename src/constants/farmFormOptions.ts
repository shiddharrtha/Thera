export const CROP_OPTIONS = ['Soybean', 'Corn', 'Wheat', 'Cotton', 'Other'] as const;
export const REGION_OPTIONS = ['Iowa', 'Illinois', 'Nebraska', 'Minnesota', 'Indiana', 'Other'] as const;

export type CropOption = (typeof CROP_OPTIONS)[number];
export type RegionOption = (typeof REGION_OPTIONS)[number];

export function resolveChipSelection<T extends string>(
  options: readonly T[],
  value?: string,
  fallback?: T,
): { selection: T; other: string } {
  const defaultSelection = fallback ?? options[0];

  if (value && (options as readonly string[]).includes(value)) {
    return { selection: value as T, other: '' };
  }
  if (value && value !== 'Other') {
    return { selection: 'Other' as T, other: value };
  }
  return { selection: defaultSelection, other: '' };
}

export function resolveChipValue(selection: string, other: string): string {
  return selection === 'Other' ? other.trim() : selection;
}
