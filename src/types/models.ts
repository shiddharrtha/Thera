export type PlanId = 'free' | 'pro' | 'enterprise';

export type FieldStatus = 'unscanned' | 'healthy' | 'warning' | 'critical';

export type ScanStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export type Units = 'imperial' | 'metric';

export interface FarmProfile {
  farmName: string;
  region: string;
  defaultCrop: string;
  units: Units;
  approximateAcres: number;
}

export interface FarmerBackground {
  /** Whole number of years the farmer has been farming. */
  yearsFarming: string;
  /** ISO date YYYY-MM-DD */
  birthday: string;
  age: string;
  fieldCount: string;
  mainCrop: string;
  /** Brand name of the pesticide they typically use. */
  pesticideBrand: string;
  farmRole: string;
  primaryGoals: string[];
}

export interface Farm {
  id: string;
  name: string;
  region: string;
  defaultCrop: string;
  units: Units;
  approximateAcres: number;
  createdAt?: string;
}

export interface UserSettings {
  scanCompletedNotifications: boolean;
  fieldAlerts: boolean;
  weeklyDigest: boolean;
  tipsAndBestPractices: boolean;
  darkMode: boolean;
}

export interface Subscription {
  planId: PlanId;
  renewsAt?: string;
}

export interface Usage {
  scansUsed: number;
  scansLimit: number | 'unlimited';
  fieldsUsed: number;
  fieldsLimit: number | 'unlimited';
  reportsUsed: number;
  reportsLimit: number | 'unlimited';
}

export interface CostAssumptions {
  chemicalCostPerUnit: number;
  applicationRatePerAcre: number;
  operationalCostPerAcre: number;
  currency: string;
  includeLaborAndFuel: boolean;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  cropType: string;
  acreage: number;
  healthScore?: number;
  openIssues: number;
  totalSavings: number;
  /** ISO-8601 UTC — last completed scan time. Format with formatOptionalDisplayDateTime for UI. */
  lastScanDate?: string;
  status: FieldStatus;
  plantingDate?: string;
  location?: string;
  hasBoundary: boolean;
}

export interface DetectedIssue {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  acres: number;
  confidence: number;
  action: string;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

export interface ScanCapture {
  videoUri: string;
  durationSeconds: number;
  gpsTrack: GpsPoint[];
  /** UTC epoch ms — when recording started (source of truth). */
  recordedAtMs: number;
  /** UTC epoch ms — when recording stopped. */
  recordedEndAtMs: number;
  /** ISO-8601 UTC — derived from recordedAtMs for storage. */
  recordedAt: string;
  /** ISO-8601 UTC — derived from recordedEndAtMs for storage. */
  recordedEndAt: string;
  /** Web recordings — used for upload filename (webm/mp4). */
  videoExtension?: string;
  videoMimeType?: string;
}

export interface Scan {
  id: string;
  fieldId: string;
  /** ISO-8601 UTC — when the field scan was recorded (for storage/sync). */
  createdAt: string;
  /** UTC epoch ms — when recording started (preferred for display). */
  recordedAtMs?: number;
  /** ISO-8601 UTC — when processing finished. */
  completedAt?: string;
  status: ScanStatus;
  progress: number;
  weedCoverage?: number;
  stressCoverage?: number;
  healthScore?: number;
  isFirstScan: boolean;
  videoUri?: string;
  videoUrl?: string;
  videoDurationSeconds?: number;
  videoExtension?: string;
  gpsTrack?: GpsPoint[];
}

export interface Report {
  id: string;
  scanId: string;
  fieldId: string;
  createdAt: string;
  /** UTC epoch ms — when the scan was recorded (preferred for display). */
  recordedAtMs?: number;
  summary: string;
  recommendedSprayAcres: number;
  estimatedSavings: number;
  chemicalReductionPercent: number;
  healthScore: number;
  severity: FieldStatus;
  findingsCount: number;
  issues: DetectedIssue[];
}

export interface AppDataState {
  onboardingComplete: boolean;
  farmerBackground?: FarmerBackground | null;
  /** @deprecated migrated to farms[] — may exist in old local storage */
  farmProfile?: FarmProfile | null;
  farms: Farm[];
  selectedFarmId: string | null;
  fields: Field[];
  scans: Scan[];
  reports: Report[];
  settings: UserSettings;
  subscription: Subscription;
  costAssumptions: CostAssumptions | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  scanCompletedNotifications: true,
  fieldAlerts: true,
  weeklyDigest: false,
  tipsAndBestPractices: true,
  darkMode: false,
};

export const DEFAULT_SUBSCRIPTION: Subscription = { planId: 'free' };

export const FREE_LIMITS = {
  scans: 3,
  fields: 1,
  reports: 3,
} as const;
