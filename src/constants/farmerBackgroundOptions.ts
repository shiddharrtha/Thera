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
