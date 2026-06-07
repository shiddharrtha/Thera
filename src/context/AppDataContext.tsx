import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { clearAppData, EMPTY_APP_DATA, loadAppData, saveAppData } from '../lib/appStorage';
import {
  completeScanRemote,
  createField,
  fetchFieldData,
  migrateLocalFieldData,
} from '../services/fieldData';
import {
  createFarmRemote,
  fetchFarms,
  fetchSelectedFarmId,
  farmFromLegacyProfile,
  farmFromProfile,
  saveOnboardingFarm,
  saveSelectedFarmId,
  updateFarmRemote,
} from '../services/farm';
import { fetchFarmProfile } from '../services/profile';
import { uploadScanVideoFile } from '../services/scanUpload';
import {
  analyzeScanVideo,
  isAnalysisApiConfigured,
  type ScanAnalysisResult,
} from '../services/scanAnalysis';
import type {
  AppDataState,
  CostAssumptions,
  Farm,
  FarmProfile,
  Field,
  Report,
  Scan,
  ScanCapture,
  UserSettings,
} from '../types/models';
import { DEFAULT_SETTINGS, FREE_LIMITS } from '../types/models';
import {
  assignFieldsToFarm,
  ensureFieldFarmId,
  getFieldsForFarm,
  getReportsForFarm,
  getScansForFarm,
  getSelectedFarm,
  mergeReports,
  mergeScans,
  resolveSelectedFarmId,
  syncFieldSavingsFromReports,
} from '../utils/farmHelpers';
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

function buildReportFromAnalysis(field: Field, scan: Scan, analysis: ScanAnalysisResult): Report {
  const recordedAtMs = getScanRecordedAtMs(scan);

  return {
    id: createId('report'),
    scanId: scan.id,
    fieldId: field.id,
    createdAt: toIsoTimestamp(recordedAtMs),
    recordedAtMs,
    summary: analysis.summary,
    recommendedSprayAcres: analysis.recommendedSprayAcres,
    estimatedSavings: analysis.estimatedSavings,
    chemicalReductionPercent: analysis.chemicalReductionPercent,
    healthScore: analysis.healthScore,
    severity: analysis.severity,
    findingsCount: analysis.findingsCount,
    issues: analysis.issues,
  };
}

/** Fallback when the analysis API is not configured (local dev without backend). */
function generateMockReportFromScan(field: Field, scan: Scan): Report {
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

type CompletedScanPayload = {
  scan: Scan;
  report: Report;
  next: AppDataState;
  updatedField: Field;
};

function buildCompletedScanState(
  current: AppDataState,
  scanId: string,
  analysis?: ScanAnalysisResult,
): CompletedScanPayload | null {
  const scan = current.scans.find((s) => s.id === scanId);
  const field = current.fields.find((f) => f.id === scan?.fieldId);
  if (!scan || !field) return null;

  const completedAt = toIsoTimestamp(Date.now());
  const completedScan: Scan = {
    ...scan,
    status: 'completed',
    progress: 100,
    completedAt,
    weedCoverage: analysis?.weedCoverage ?? scan.weedCoverage ?? 18,
    stressCoverage: analysis?.stressCoverage ?? scan.stressCoverage ?? 8,
    healthScore: analysis?.healthScore ?? scan.healthScore ?? 82,
  };
  const report = analysis
    ? buildReportFromAnalysis(field, completedScan, analysis)
    : generateMockReportFromScan(field, completedScan);
  const updatedField: Field = ensureFieldFarmId(
    {
      ...field,
      healthScore: report.healthScore,
      openIssues: report.findingsCount,
      totalSavings: report.estimatedSavings,
      lastScanDate: toIsoTimestamp(getScanRecordedAtMs(completedScan)),
      status: report.severity,
    },
    current.selectedFarmId,
  );

  return {
    scan: completedScan,
    report,
    updatedField,
    next: {
      ...current,
      scans: current.scans.map((s) => (s.id === scanId ? completedScan : s)),
      reports: [...current.reports, report],
      fields: current.fields.map((f) => (f.id === field.id ? updatedField : f)),
    },
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
  completeOnboarding: (profile: FarmProfile) => Promise<Farm>;
  addFarm: (profile: FarmProfile) => Promise<Farm>;
  switchFarm: (farmId: string) => Promise<void>;
  updateFarm: (farmId: string, patch: Partial<FarmProfile>) => Promise<void>;
  /** @deprecated use updateFarm */
  updateFarmProfile: (patch: Partial<FarmProfile>) => Promise<void>;
  getSelectedFarm: () => Farm | undefined;
  getFieldsForSelectedFarm: () => Field[];
  addField: (input: Omit<Field, 'id' | 'farmId' | 'openIssues' | 'totalSavings' | 'status' | 'hasBoundary'> & { hasBoundary?: boolean }) => Promise<Field>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  updateCostAssumptions: (assumptions: CostAssumptions) => Promise<void>;
  startScan: (fieldId: string, capture?: ScanCapture) => Promise<Scan>;
  uploadScanVideo: (
    scanId: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) => Promise<Scan | null>;
  analyzeScan: (
    scanId: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) => Promise<{ scan: Scan; analysis: ScanAnalysisResult } | null>;
  advanceScanProgress: (scanId: string, progress: number, status?: Scan['status']) => Promise<Scan | null>;
  completeScan: (
    scanId: string,
    analysis?: ScanAnalysisResult,
  ) => Promise<{ scan: Scan; report: Report } | null>;
  discardScan: (scanId: string) => Promise<void>;
  isAnalysisApiConfigured: boolean;
  getField: (id: string) => Field | undefined;
  getScan: (id: string) => Scan | undefined;
  getReport: (id: string) => Report | undefined;
  getReportsForField: (fieldId: string) => Report[];
  getScansForField: (fieldId: string) => Scan[];
  getUsage: () => { scansUsed: number; scansLimit: number | 'unlimited'; fieldsUsed: number; fieldsLimit: number | 'unlimited'; reportsUsed: number; reportsLimit: number | 'unlimited' };
  getSavingsSummary: () => {
    totalSavings: number;
    sprayAreaAvoided: number;
    avgReduction: number | null;
    costReduction: number | null;
    reportCount: number;
  };
  hasCompletedScans: boolean;
  resetForSignOut: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppDataState>({
    onboardingComplete: false,
    farms: [],
    selectedFarmId: null,
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
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!user) {
      const emptyState: AppDataState = {
        ...EMPTY_APP_DATA,
        settings: DEFAULT_SETTINGS,
        subscription: { planId: 'free' },
      };
      dataRef.current = emptyState;
      setData(emptyState);
      setSelectedFieldId(null);
      setSelectedScanId(null);
      setSelectedReportId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadAppData(user.uid)
      .then(async (local) => {
        let farms = local.farms;
        let selectedFarmId = local.selectedFarmId;
        let onboardingComplete = local.onboardingComplete;

        if (farms.length === 0 && local.farmProfile) {
          farms = [farmFromLegacyProfile(user.uid, local.farmProfile)];
          selectedFarmId = farms[0].id;
          onboardingComplete = true;
        }

        try {
          const remoteFarms = await fetchFarms(user.uid);
          if (remoteFarms.length > 0) {
            farms = remoteFarms;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] fetch farms failed', error);
          }
        }

        if (farms.length === 0) {
          try {
            const remote = await fetchFarmProfile(user.uid);
            if (remote.onboardingComplete && remote.farmProfile) {
              farms = [farmFromLegacyProfile(user.uid, remote.farmProfile)];
              onboardingComplete = true;
            }
          } catch (error) {
            if (__DEV__) {
              console.warn('[profile] fetch farm profile failed', error);
            }
          }
        }

        try {
          const remoteSelectedFarmId = await fetchSelectedFarmId(user.uid);
          if (remoteSelectedFarmId && farms.some((farm) => farm.id === remoteSelectedFarmId)) {
            selectedFarmId = remoteSelectedFarmId;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] fetch selected farm failed', error);
          }
        }

        selectedFarmId = resolveSelectedFarmId(farms, selectedFarmId);

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
            scans = mergeScans(local.scans, remoteData.scans);
            reports = mergeReports(local.reports, remoteData.reports);
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

        if (selectedFarmId) {
          fields = assignFieldsToFarm(fields, selectedFarmId);
        }

        scans = normalizeScanTimestamps(scans);
        fields = normalizeFieldTimestamps(fields, scans);
        fields = syncFieldSavingsFromReports(fields, reports);

        const merged = {
          ...local,
          farms,
          selectedFarmId,
          onboardingComplete,
          fields: normalizeFieldTimestamps(fields, scans),
          scans,
          reports,
        };
        await saveAppData(user.uid, merged);
        dataRef.current = merged;
        return merged;
      })
      .then((merged) => {
        dataRef.current = merged;
        setData(merged);
      })
      .finally(() => setLoading(false));
  }, [user?.uid, displayName]);

  const persist = useCallback(
    async (next: AppDataState) => {
      dataRef.current = next;
      setData(next);
      if (user) await saveAppData(user.uid, next);
    },
    [user],
  );

  /** Apply a state change from the latest snapshot (avoids stale-closure overwrites during scans). */
  const mutateAppData = useCallback(
    async (recipe: (prev: AppDataState) => AppDataState): Promise<AppDataState> => {
      const next = recipe(dataRef.current);
      dataRef.current = next;
      setData(next);
      if (user) await saveAppData(user.uid, next);
      return next;
    },
    [user],
  );

  const completeOnboarding = useCallback(
    async (profile: FarmProfile) => {
      const farmId = createId('farm');
      let farm = farmFromProfile(profile, farmId);

      if (user) {
        try {
          farm = await createFarmRemote(user, farm);
          await saveOnboardingFarm(user, farm, displayName);
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] complete onboarding sync failed', error);
          }
        }
      }

      const next = {
        ...data,
        farms: [farm],
        selectedFarmId: farm.id,
        onboardingComplete: true,
      };
      await persist(next);
      return farm;
    },
    [data, persist, user, displayName],
  );

  const addFarm = useCallback(
    async (profile: FarmProfile) => {
      const farmId = createId('farm');
      let farm = farmFromProfile(profile, farmId);

      if (user) {
        try {
          farm = await createFarmRemote(user, farm);
          await saveSelectedFarmId(user, farm.id);
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] add farm sync failed', error);
          }
          throw error;
        }
      }

      const next = {
        ...data,
        farms: [...data.farms, farm],
        selectedFarmId: farm.id,
        onboardingComplete: true,
      };
      await persist(next);
      setSelectedFieldId(null);
      setSelectedScanId(null);
      setSelectedReportId(null);
      return farm;
    },
    [data, persist, user],
  );

  const switchFarm = useCallback(
    async (farmId: string) => {
      if (!data.farms.some((farm) => farm.id === farmId)) return;

      const next = { ...data, selectedFarmId: farmId };
      await persist(next);
      setSelectedFieldId(null);
      setSelectedScanId(null);
      setSelectedReportId(null);

      if (user) {
        try {
          await saveSelectedFarmId(user, farmId);
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] save selected farm failed', error);
          }
        }
      }
    },
    [data, persist, user],
  );

  const updateFarm = useCallback(
    async (farmId: string, patch: Partial<FarmProfile>) => {
      const existing = data.farms.find((farm) => farm.id === farmId);
      if (!existing) return;

      let updated: Farm = {
        ...existing,
        name: patch.farmName?.trim() ?? existing.name,
        region: patch.region ?? existing.region,
        defaultCrop: patch.defaultCrop ?? existing.defaultCrop,
        units: patch.units ?? existing.units,
        approximateAcres: patch.approximateAcres ?? existing.approximateAcres,
      };

      if (user) {
        try {
          updated = await updateFarmRemote(user, updated);
          if (data.selectedFarmId === farmId) {
            await saveOnboardingFarm(user, updated, displayName);
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[farm] update farm sync failed', error);
          }
          throw error;
        }
      }

      const next = {
        ...data,
        farms: data.farms.map((farm) => (farm.id === farmId ? updated : farm)),
      };
      await persist(next);
    },
    [data, persist, user, displayName],
  );

  const updateFarmProfile = useCallback(
    async (patch: Partial<FarmProfile>) => {
      const farmId = resolveSelectedFarmId(data.farms, data.selectedFarmId);
      if (!farmId) return;
      await updateFarm(farmId, patch);
    },
    [data.farms, data.selectedFarmId, updateFarm],
  );

  const addField = useCallback(
    async (
      input: Omit<Field, 'id' | 'farmId' | 'openIssues' | 'totalSavings' | 'status' | 'hasBoundary'> & {
        hasBoundary?: boolean;
      },
    ) => {
      const farmId = resolveSelectedFarmId(data.farms, data.selectedFarmId);
      if (!farmId) {
        throw new Error('Select a farm before adding a field.');
      }

      const field: Field = {
        id: createId('field'),
        farmId,
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
      const scanRef: { value: Scan | null } = { value: null };

      await mutateAppData((prev) => {
        const isFirstScan = prev.scans.filter((s) => s.status === 'completed').length === 0;
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
        scanRef.value = scan;
        return { ...prev, scans: [...prev.scans, scan] };
      });

      const scan = scanRef.value;
      if (!scan) throw new Error('Could not start scan.');

      setSelectedScanId(scan.id);
      setSelectedFieldId(fieldId);
      return scan;
    },
    [mutateAppData],
  );

  const advanceScanProgress = useCallback(
    async (scanId: string, progress: number, status?: Scan['status']) => {
      const updatedRef: { value: Scan | null } = { value: null };

      await mutateAppData((prev) => {
        const scan = prev.scans.find((s) => s.id === scanId);
        if (!scan) return prev;
        const updated: Scan = {
          ...scan,
          progress,
          status: status ?? scan.status,
        };
        updatedRef.value = updated;
        return {
          ...prev,
          scans: prev.scans.map((s) => (s.id === scanId ? updated : s)),
        };
      });

      return updatedRef.value;
    },
    [mutateAppData],
  );

  const uploadScanVideo = useCallback(
    async (scanId: string, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
      const scanRef: { value: Scan | null } = { value: null };

      await mutateAppData((prev) => {
        scanRef.value = prev.scans.find((s) => s.id === scanId) ?? null;
        return prev;
      });

      const scan = scanRef.value;
      if (!scan?.videoUri) return scan ?? null;
      if (scan.videoUrl) return scan;

      if (!user) {
        await mutateAppData((prev) => {
          const latest = prev.scans.find((s) => s.id === scanId);
          if (!latest) return prev;
          const localOnly: Scan = { ...latest, status: 'processing', progress: 30 };
          scanRef.value = localOnly;
          return {
            ...prev,
            scans: prev.scans.map((s) => (s.id === scanId ? localOnly : s)),
          };
        });
        return scanRef.value;
      }

      try {
        const storagePath = await uploadScanVideoFile(
          user.uid,
          scanId,
          scan.videoUri,
          onProgress,
          signal,
        );

        await mutateAppData((prev) => {
          const latest = prev.scans.find((s) => s.id === scanId);
          if (!latest) return prev;
          const updated: Scan = {
            ...latest,
            videoUrl: storagePath,
            progress: 30,
            status: 'processing',
          };
          scanRef.value = updated;
          return {
            ...prev,
            scans: prev.scans.map((s) => (s.id === scanId ? updated : s)),
          };
        });

        return scanRef.value;
      } catch (error) {
        if (__DEV__) {
          console.warn('[scanUpload] upload failed', error);
        }
        throw error;
      }
    },
    [mutateAppData, user],
  );

  const analyzeScan = useCallback(
    async (scanId: string, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
      const contextRef: {
        scan: Scan | null;
        field: Field | null;
      } = { scan: null, field: null };

      for (let attempt = 0; attempt < 40; attempt++) {
        const snapshot = dataRef.current;
        if (!snapshot) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }
        const scan = snapshot.scans.find((s) => s.id === scanId) ?? null;
        const field = snapshot.fields.find((f) => f.id === scan?.fieldId) ?? null;
        contextRef.scan = scan;
        contextRef.field = field;

        if (scan && field) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const { scan, field } = contextRef;
      if (!scan || !field) return null;

      if (!user) {
        throw new Error('Sign in to analyze scans.');
      }

      const analysis = await analyzeScanVideo(scan, field, user.uid, onProgress, signal);
      const resultRef: { value: { scan: Scan; analysis: ScanAnalysisResult } | null } = { value: null };

      await mutateAppData((prev) => {
        const latest = prev.scans.find((s) => s.id === scanId);
        if (!latest) return prev;
        const updated: Scan = {
          ...latest,
          weedCoverage: analysis.weedCoverage,
          stressCoverage: analysis.stressCoverage,
          healthScore: analysis.healthScore,
          progress: 99,
          status: 'processing',
          ...(analysis.videoPath ? { videoUrl: analysis.videoPath } : {}),
        };
        resultRef.value = { scan: updated, analysis };
        return {
          ...prev,
          scans: prev.scans.map((s) => (s.id === scanId ? updated : s)),
        };
      });

      return resultRef.value;
    },
    [mutateAppData, user],
  );

  const completeScan = useCallback(
    async (scanId: string, analysis?: ScanAnalysisResult) => {
      const completionRef: { value: CompletedScanPayload | null } = { value: null };

      await mutateAppData((current) => {
        const built = buildCompletedScanState(current, scanId, analysis);
        if (!built) return current;
        completionRef.value = built;
        return built.next;
      });

      const completion = completionRef.value;
      if (!completion) return null;

      if (user) {
        try {
          await completeScanRemote(user.uid, completion.scan, completion.report, completion.updatedField);
        } catch (error) {
          if (__DEV__) {
            console.warn('[fieldData] complete scan sync failed', error);
          }
        }
      }

      setSelectedReportId(completion.report.id);
      setSelectedScanId(completion.scan.id);
      setSelectedFieldId(completion.report.fieldId);
      return { scan: completion.scan, report: completion.report };
    },
    [mutateAppData, user],
  );

  const discardScan = useCallback(
    async (scanId: string) => {
      const current = dataRef.current;
      const scan = current.scans.find((s) => s.id === scanId);
      if (!scan || scan.status === 'completed') return;

      const next = {
        ...current,
        scans: current.scans.filter((s) => s.id !== scanId),
      };
      dataRef.current = next;
      setData(next);

      if (user) {
        await saveAppData(user.uid, next);
      }

      if (selectedScanId === scanId) {
        setSelectedScanId(null);
      }
    },
    [user, selectedScanId],
  );

  const getSelectedFarmFn = useCallback(
    () => getSelectedFarm(data.farms, data.selectedFarmId),
    [data.farms, data.selectedFarmId],
  );

  const getFieldsForSelectedFarm = useCallback(
    () => getFieldsForFarm(data.fields, data.selectedFarmId),
    [data.fields, data.selectedFarmId],
  );

  const getField = useCallback((id: string) => data.fields.find((f) => f.id === id), [data.fields]);
  const getScan = useCallback((id: string) => data.scans.find((s) => s.id === id), [data.scans]);
  const getReport = useCallback((id: string) => data.reports.find((r) => r.id === id), [data.reports]);
  const getReportsForField = useCallback(
    (fieldId: string) => data.reports.filter((r) => r.fieldId === fieldId),
    [data.reports],
  );
  const getScansForField = useCallback(
    (fieldId: string) => data.scans.filter((s) => s.fieldId === fieldId && s.status === 'completed'),
    [data.scans],
  );

  const getUsage = useCallback(() => {
    const isPro = data.subscription.planId !== 'free';
    const farmFields = getFieldsForFarm(data.fields, data.selectedFarmId);
    const farmScans = getScansForFarm(data.scans, data.fields, data.selectedFarmId);
    const farmReports = getReportsForFarm(data.reports, data.fields, data.selectedFarmId);

    return {
      scansUsed: farmScans.filter((s) => s.status === 'completed').length,
      scansLimit: isPro ? 'unlimited' as const : FREE_LIMITS.scans,
      fieldsUsed: farmFields.length,
      fieldsLimit: isPro ? 'unlimited' as const : FREE_LIMITS.fields,
      reportsUsed: farmReports.length,
      reportsLimit: isPro ? 'unlimited' as const : FREE_LIMITS.reports,
    };
  }, [data]);

  const getSavingsSummary = useCallback(() => {
    const farmFields = getFieldsForFarm(data.fields, data.selectedFarmId);
    const farmReports = getReportsForFarm(data.reports, data.fields, data.selectedFarmId);
    const totalFromReports = farmReports.reduce((sum, r) => sum + r.estimatedSavings, 0);
    const totalFromFields = farmFields.reduce((sum, f) => sum + f.totalSavings, 0);
    const totalSavings = Math.max(totalFromReports, totalFromFields);
    const totalAcres = farmFields.reduce((sum, f) => sum + f.acreage, 0);
    const sprayAcres = farmReports.reduce((sum, r) => sum + r.recommendedSprayAcres, 0);
    const sprayAreaAvoided = Math.max(0, totalAcres - sprayAcres);
    const avgReduction = farmReports.length > 0
      ? Math.round(farmReports.reduce((sum, r) => sum + r.chemicalReductionPercent, 0) / farmReports.length)
      : null;
    const costReduction = avgReduction;
    return { totalSavings, sprayAreaAvoided, avgReduction, costReduction, reportCount: farmReports.length };
  }, [data]);

  const hasCompletedScans = useMemo(() => {
    const farmScans = getScansForFarm(data.scans, data.fields, data.selectedFarmId);
    if (farmScans.some((s) => s.status === 'completed')) return true;
    const farmReports = getReportsForFarm(data.reports, data.fields, data.selectedFarmId);
    return farmReports.length > 0;
  }, [data]);

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
      addFarm,
      switchFarm,
      updateFarm,
      updateFarmProfile,
      getSelectedFarm: getSelectedFarmFn,
      getFieldsForSelectedFarm,
      addField,
      updateSettings,
      updateCostAssumptions,
      startScan,
      uploadScanVideo,
      analyzeScan,
      advanceScanProgress,
      completeScan,
      discardScan,
      isAnalysisApiConfigured: isAnalysisApiConfigured(),
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
      addFarm,
      switchFarm,
      updateFarm,
      updateFarmProfile,
      getSelectedFarmFn,
      getFieldsForSelectedFarm,
      addField,
      updateSettings,
      updateCostAssumptions,
      startScan,
      uploadScanVideo,
      analyzeScan,
      advanceScanProgress,
      completeScan,
      discardScan,
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
