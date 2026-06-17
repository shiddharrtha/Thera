export const FARM_ROLE_OPTIONS = [
  'Farm owner / operator',
  'Farm manager',
  'Agronomist / advisor',
  'Other',
] as const;

export const PRIMARY_GOAL_OPTIONS = [
  'Weed scouting',
  'Reduce chemical costs',
  'Track crop health',
  'Field mapping',
  'Record keeping',
] as const;

export type FarmRoleOption = (typeof FARM_ROLE_OPTIONS)[number];
export type PrimaryGoalOption = (typeof PRIMARY_GOAL_OPTIONS)[number];

export function resolveFarmRoleSelection(
  role?: string,
  fallback: FarmRoleOption = 'Farm owner / operator',
): { selection: FarmRoleOption; other: string } {
  if (role && (FARM_ROLE_OPTIONS as readonly string[]).includes(role)) {
    return { selection: role as FarmRoleOption, other: '' };
  }
  if (role?.trim()) {
    return { selection: 'Other', other: role.trim() };
  }
  return { selection: fallback, other: '' };
}
