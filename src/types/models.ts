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
  name: string;
  cropType: string;
  acreage: number;
  healthScore?: number;
  openIssues: number;
  totalSavings: number;
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

export interface Scan {
  id: string;
  fieldId: string;
  createdAt: string;
  status: ScanStatus;
  progress: number;
  weedCoverage?: number;
  stressCoverage?: number;
  healthScore?: number;
  isFirstScan: boolean;
}

export interface Report {
  id: string;
  scanId: string;
  fieldId: string;
  createdAt: string;
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
  farmProfile: FarmProfile | null;
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
