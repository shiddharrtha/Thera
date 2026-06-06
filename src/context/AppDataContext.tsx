import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { clearAppData, loadAppData, saveAppData } from '../lib/appStorage';
import {
  completeScanRemote,
  createField,
  createScan,
  fetchFieldData,
  migrateLocalFieldData,
  updateScan,
} from '../services/fieldData';
import { fetchFarmProfile, saveFarmProfile } from '../services/profile';
import { uploadScanVideoFile } from '../services/scanUpload';
import type {
  AppDataState,
  CostAssumptions,
  FarmProfile,
  Field,
  Report,
  Scan,
  ScanCapture,
  UserSettings,
} from '../types/models';
import { DEFAULT_SETTINGS, FREE_LIMITS } from '../types/models';
import { toIsoTimestamp, normalizeFieldTimestamps, normalizeScanTimestamps, getScanRecordedAtMs } from '../utils/timestamps';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveFieldStatus(healthScore?: number, openIssues?: number): Field['status'] {
  if (healthScore === undefined) return 'unscanned';
  if (openIssues && openIssues >= 4) return 'critical';
  if (healthScore < 75 || (openIssues && openIssues >= 2)) return 'warning';
  return 'healthy';
}

function generateReportFromScan(field: Field, scan: Scan): Report {
  const healthScore = scan.healthScore ?? 78;
  const weedCoverage = scan.weedCoverage ?? 18;
  const stressCoverage = scan.stressCoverage ?? 8;
  const openIssues = healthScore < 80 ? 3 : healthScore < 90 ? 1 : 0;
  const recommendedSprayAcres = Math.round(field.acreage * (weedCoverage / 100) * 10) / 10;
  const estimatedSavings = Math.round(recommendedSprayAcres * 12 + field.acreage * 4);
  const chemicalReductionPercent = Math.round(100 - (recommendedSprayAcres / field.acreage) * 100);

  const recordedAtMs = getScanRecordedAtMs(scan);

  return {
    id: createId('report'),
    scanId: scan.id,
    fieldId: field.id,
    createdAt: toIsoTimestamp(recordedAtMs),
    recordedAtMs,
    summary: `Detected moderate weed pressure (${weedCoverage}%) and low crop stress (${stressCoverage}%) across ${field.name}. Targeted treatment recommended for ${recommendedSprayAcres} acres.`,
    recommendedSprayAcres,
    estimatedSavings,
    chemicalReductionPercent: Math.max(0, chemicalReductionPercent),
    healthScore,
    severity: deriveFieldStatus(healthScore, openIssues),
    findingsCount: openIssues,
    issues: openIssues > 0
      ? [
          {
            id: createId('issue'),
            title: 'Elevated weed pressure in north section',
            severity: 'medium',
            acres: Math.round(recommendedSprayAcres * 0.6 * 10) / 10,
            confidence: 0.89,
            action: 'Apply targeted herbicide within 5–7 days',
          },
          ...(openIssues > 1
            ? [{
                id: createId('issue'),
                title: 'Early crop stress indicators',
                severity: 'low' as const,
                acres: Math.round(field.acreage * 0.08 * 10) / 10,
                confidence: 0.76,
                action: 'Monitor moisture and nutrient levels',
              }]
            : []),
        ]
      : [],
  };
}

interface AppDataContextValue {
  loading: boolean;
  data: AppDataState;
  selectedFieldId: string | null;
  selectedScanId: string | null;
  selectedReportId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  setSelectedScanId: (id: string | null) => void;
  setSelectedReportId: (id: string | null) => void;
  completeOnboarding: (profile: FarmProfile) => Promise<void>;
  addField: (input: Omit<Field, 'id' | 'openIssues' | 'totalSavings' | 'status' | 'hasBoundary'> & { hasBoundary?: boolean }) => Promise<Field>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  updateCostAssumptions: (assumptions: CostAssumptions) => Promise<void>;
  startScan: (fieldId: string, capture?: ScanCapture) => Promise<Scan>;
  uploadScanVideo: (scanId: string, onProgress?: (percent: number) => void) => Promise<Scan | null>;
  advanceScanProgress: (scanId: string, progress: number, status?: Scan['status']) => Promise<Scan | null>;
  completeScan: (scanId: string) => Promise<{ scan: Scan; report: Report } | null>;
  getField: (id: string) => Field | undefined;
  getScan: (id: string) => Scan | undefined;
  getReport: (id: string) => Report | undefined;
  getReportsForField: (fieldId: string) => Report[];
  getScansForField: (fieldId: string) => Scan[];
  getUsage: () => { scansUsed: number; scansLimit: number | 'unlimited'; fieldsUsed: number; fieldsLimit: number | 'unlimited'; reportsUsed: number; reportsLimit: number | 'unlimited' };
  getSavingsSummary: () => { totalSavings: number; sprayAreaAvoided: number; avgReduction: number | null; costReduction: number | null };
  hasCompletedScans: boolean;
  resetForSignOut: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppDataState>({
    onboardingComplete: false,
    farmProfile: null,
    fields: [],
    scans: [],
    reports: [],
    settings: DEFAULT_SETTINGS,
    subscription: { planId: 'free' },
    costAssumptions: null,
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setData({
        onboardingComplete: false,
        farmProfile: null,
        fields: [],
        scans: [],
        reports: [],
        settings: DEFAULT_SETTINGS,
        subscription: { planId: 'free' },
        costAssumptions: null,
      });
      setSelectedFieldId(null);
      setSelectedScanId(null);
      setSelectedReportId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadAppData(user.uid)
      .then(async (local) => {
        let farmProfile = local.farmProfile;
        let onboardingComplete = local.onboardingComplete;

        if (!local.onboardingComplete || !local.farmProfile) {
          try {
            const remote = await fetchFarmProfile(user.uid);
            if (remote.onboardingComplete && remote.farmProfile) {
              farmProfile = remote.farmProfile;
              onboardingComplete = true;
            }
          } catch (error) {
            if (__DEV__) {
              console.warn('[profile] fetch farm profile failed', error);
            }
          }
        }

        let fields = local.fields;
        let scans = local.scans;
        let reports = local.reports;

        try {
          const remoteData = await fetchFieldData(user.uid);
          const hasRemoteData =
            remoteData.fields.length > 0 ||
            remoteData.scans.length > 0 ||
            remoteData.reports.length > 0;

          if (hasRemoteData) {
            fields = remoteData.fields;
            scans = remoteData.scans;
            reports = remoteData.reports;
          } else if (local.fields.length > 0) {
            await migrateLocalFieldData(user, {
              fields: local.fields,
              scans: local.scans,
              reports: local.reports,
            });
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] fetch field data failed', error);
          }
        }

        if (onboardingComplete && farmProfile) {
          saveFarmProfile(user, farmProfile, displayName).catch((error) => {
            if (__DEV__) {
              console.warn('[profile] background farm profile sync failed', error);
            }
          });
        }

        scans = normalizeScanTimestamps(scans);
        fields = normalizeFieldTimestamps(fields, scans);

        const merged = {
          ...local,
          farmProfile,
          onboardingComplete,
          fields: normalizeFieldTimestamps(fields, scans),
          scans,
          reports,
        };
        await saveAppData(user.uid, merged);
        return merged;
      })
      .then(setData)
      .finally(() => setLoading(false));
  }, [user?.uid, displayName]);

  const persist = useCallback(
    async (next: AppDataState) => {
      setData(next);
      if (user) await saveAppData(user.uid, next);
    },
    [user],
  );

  const completeOnboarding = useCallback(
    async (profile: FarmProfile) => {
      const next = { ...data, farmProfile: profile, onboardingComplete: true };
      await persist(next);
      if (user) {
        await saveFarmProfile(user, profile, displayName);
      }
    },
    [data, persist, user, displayName],
  );

  const addField = useCallback(
    async (
      input: Omit<Field, 'id' | 'openIssues' | 'totalSavings' | 'status' | 'hasBoundary'> & {
        hasBoundary?: boolean;
      },
    ) => {
      const field: Field = {
        id: createId('field'),
        name: input.name,
        cropType: input.cropType,
        acreage: input.acreage,
        plantingDate: input.plantingDate,
        location: input.location,
        hasBoundary: input.hasBoundary ?? false,
        openIssues: 0,
        totalSavings: 0,
        status: 'unscanned',
      };

      if (user) {
        try {
          const saved = await createField(user, field);
          const next = { ...data, fields: [...data.fields, saved] };
          await persist(next);
          return saved;
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] create field failed, saving locally', error);
          }
        }
      }

      const next = { ...data, fields: [...data.fields, field] };
      await persist(next);
      return field;
    },
    [data, persist, user],
  );

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      await persist({ ...data, settings: { ...data.settings, ...patch } });
    },
    [data, persist],
  );

  const updateCostAssumptions = useCallback(
    async (assumptions: CostAssumptions) => {
      await persist({ ...data, costAssumptions: assumptions });
    },
    [data, persist],
  );

  const startScan = useCallback(
    async (fieldId: string, capture?: ScanCapture) => {
      const isFirstScan = data.scans.filter((s) => s.status === 'completed').length === 0;
      const recordedAtMs = capture?.recordedAtMs ?? Date.now();
      const scan: Scan = {
        id: createId('scan'),
        fieldId,
        createdAt: toIsoTimestamp(recordedAtMs),
        recordedAtMs,
        status: 'uploading',
        progress: 0,
        isFirstScan,
        videoUri: capture?.videoUri,
        videoDurationSeconds: capture?.durationSeconds,
        gpsTrack: capture?.gpsTrack,
      };

      if (user) {
        try {
          const saved = await createScan(user.uid, scan);
          const merged = {
            ...saved,
            createdAt: scan.createdAt,
            recordedAtMs: scan.recordedAtMs,
            videoUri: scan.videoUri,
            videoDurationSeconds: scan.videoDurationSeconds,
            gpsTrack: scan.gpsTrack,
          };
          const next = { ...data, scans: [...data.scans, merged] };
          await persist(next);
          setSelectedScanId(merged.id);
          setSelectedFieldId(fieldId);
          return merged;
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] create scan failed, saving locally', error);
          }
        }
      }

      const next = { ...data, scans: [...data.scans, scan] };
      await persist(next);
      setSelectedScanId(scan.id);
      setSelectedFieldId(fieldId);
      return scan;
    },
    [data, persist, user],
  );

  const advanceScanProgress = useCallback(
    async (scanId: string, progress: number, status?: Scan['status']) => {
      const scan = data.scans.find((s) => s.id === scanId);
      if (!scan) return null;
      const updated: Scan = {
        ...scan,
        progress,
        status: status ?? scan.status,
        weedCoverage: progress >= 60 ? 18 + Math.round(Math.random() * 8) : scan.weedCoverage,
        stressCoverage: progress >= 80 ? 6 + Math.round(Math.random() * 6) : scan.stressCoverage,
        healthScore: progress >= 90 ? 72 + Math.round(Math.random() * 20) : scan.healthScore,
      };
      const scans = data.scans.map((s) => (s.id === scanId ? updated : s));

      if (user) {
        try {
          const saved = await updateScan(user.uid, updated);
          const next = { ...data, scans: data.scans.map((s) => (s.id === scanId ? saved : s)) };
          await persist(next);
          return saved;
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] update scan failed, saving locally', error);
          }
        }
      }

      await persist({ ...data, scans });
      return updated;
    },
    [data, persist, user],
  );

  const uploadScanVideo = useCallback(
    async (scanId: string, onProgress?: (percent: number) => void) => {
      const scan = data.scans.find((s) => s.id === scanId);
      if (!scan?.videoUri) return scan ?? null;
      if (scan.videoUrl) return scan;

      const mapUploadProgress = (uploadPercent: number) => {
        onProgress?.(uploadPercent);
      };

      if (!user) {
        const localOnly: Scan = { ...scan, status: 'processing', progress: 30 };
        await persist({
          ...data,
          scans: data.scans.map((s) => (s.id === scanId ? localOnly : s)),
        });
        return localOnly;
      }

      try {
        const storagePath = await uploadScanVideoFile(
          user.uid,
          scanId,
          scan.videoUri,
          mapUploadProgress,
        );

        const updated: Scan = {
          ...scan,
          videoUrl: storagePath,
          progress: 30,
          status: 'processing',
        };

        const saved = await updateScan(user.uid, updated);
        const merged = {
          ...updated,
          ...saved,
          createdAt: scan.createdAt,
          recordedAtMs: scan.recordedAtMs,
          videoUri: scan.videoUri,
        };
        const next = {
          ...data,
          scans: data.scans.map((s) => (s.id === scanId ? merged : s)),
        };
        await persist(next);
        return merged;
      } catch (error) {
        if (__DEV__) {
          console.warn('[scanUpload] upload failed', error);
        }
        throw error;
      }
    },
    [data, persist, user],
  );

  const completeScan = useCallback(
    async (scanId: string) => {
      const scan = data.scans.find((s) => s.id === scanId);
      const field = data.fields.find((f) => f.id === scan?.fieldId);
      if (!scan || !field) return null;

      const completedAt = toIsoTimestamp(Date.now());
      const completedScan: Scan = {
        ...scan,
        status: 'completed',
        progress: 100,
        completedAt,
        weedCoverage: scan.weedCoverage ?? 18,
        stressCoverage: scan.stressCoverage ?? 8,
        healthScore: scan.healthScore ?? 82,
      };
      const report = generateReportFromScan(field, completedScan);
      const updatedField: Field = {
        ...field,
        healthScore: report.healthScore,
        openIssues: report.findingsCount,
        totalSavings: report.estimatedSavings,
        lastScanDate: toIsoTimestamp(getScanRecordedAtMs(completedScan)),
        status: report.severity,
      };
      const next = {
        ...data,
        scans: data.scans.map((s) => (s.id === scanId ? completedScan : s)),
        reports: [...data.reports, report],
        fields: data.fields.map((f) => (f.id === field.id ? updatedField : f)),
      };

      if (user) {
        try {
          await completeScanRemote(user.uid, completedScan, report, updatedField);
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] complete scan failed, saving locally', error);
          }
        }
      }

      await persist(next);
      setSelectedReportId(report.id);
      return { scan: completedScan, report };
    },
    [data, persist, user],
  );

  const getField = useCallback((id: string) => data.fields.find((f) => f.id === id), [data.fields]);
  const getScan = useCallback((id: string) => data.scans.find((s) => s.id === id), [data.scans]);
  const getReport = useCallback((id: string) => data.reports.find((r) => r.id === id), [data.reports]);
  const getReportsForField = useCallback(
    (fieldId: string) => data.reports.filter((r) => r.fieldId === fieldId),
    [data.reports],
  );
  const getScansForField = useCallback(
    (fieldId: string) => data.scans.filter((s) => s.fieldId === fieldId),
    [data.scans],
  );

  const getUsage = useCallback(() => {
    const isPro = data.subscription.planId !== 'free';
    return {
      scansUsed: data.scans.filter((s) => s.status === 'completed').length,
      scansLimit: isPro ? 'unlimited' as const : FREE_LIMITS.scans,
      fieldsUsed: data.fields.length,
      fieldsLimit: isPro ? 'unlimited' as const : FREE_LIMITS.fields,
      reportsUsed: data.reports.length,
      reportsLimit: isPro ? 'unlimited' as const : FREE_LIMITS.reports,
    };
  }, [data]);

  const getSavingsSummary = useCallback(() => {
    const totalSavings = data.fields.reduce((sum, f) => sum + f.totalSavings, 0);
    const totalAcres = data.fields.reduce((sum, f) => sum + f.acreage, 0);
    const sprayAcres = data.reports.reduce((sum, r) => sum + r.recommendedSprayAcres, 0);
    const sprayAreaAvoided = Math.max(0, totalAcres - sprayAcres);
    const avgReduction = data.reports.length > 0
      ? Math.round(data.reports.reduce((sum, r) => sum + r.chemicalReductionPercent, 0) / data.reports.length)
      : null;
    const costReduction = avgReduction;
    return { totalSavings, sprayAreaAvoided, avgReduction, costReduction };
  }, [data]);

  const hasCompletedScans = useMemo(
    () => data.scans.some((s) => s.status === 'completed'),
    [data.scans],
  );

  const resetForSignOut = useCallback(() => {
    setSelectedFieldId(null);
    setSelectedScanId(null);
    setSelectedReportId(null);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      data,
      selectedFieldId,
      selectedScanId,
      selectedReportId,
      setSelectedFieldId,
      setSelectedScanId,
      setSelectedReportId,
      completeOnboarding,
      addField,
      updateSettings,
      updateCostAssumptions,
      startScan,
      uploadScanVideo,
      advanceScanProgress,
      completeScan,
      getField,
      getScan,
      getReport,
      getReportsForField,
      getScansForField,
      getUsage,
      getSavingsSummary,
      hasCompletedScans,
      resetForSignOut,
    }),
    [
      loading,
      data,
      selectedFieldId,
      selectedScanId,
      selectedReportId,
      completeOnboarding,
      addField,
      updateSettings,
      updateCostAssumptions,
      startScan,
      uploadScanVideo,
      advanceScanProgress,
      completeScan,
      getField,
      getScan,
      getReport,
      getReportsForField,
      getScansForField,
      getUsage,
      getSavingsSummary,
      hasCompletedScans,
      resetForSignOut,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export { clearAppData };
