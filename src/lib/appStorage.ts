import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppDataState, Farm, Scan } from '../types/models';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUBSCRIPTION,
} from '../types/models';
import { assignFieldsToFarm, farmFromProfile, resolveSelectedFarmId } from '../utils/farmHelpers';

const STORAGE_PREFIX = 'thera_app_data_';

export function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export const EMPTY_APP_DATA: AppDataState = {
  onboardingComplete: false,
  farms: [],
  selectedFarmId: null,
  fields: [],
  scans: [],
  reports: [],
  settings: DEFAULT_SETTINGS,
  subscription: DEFAULT_SUBSCRIPTION,
  costAssumptions: null,
};

export function completedScansOnly(scans: Scan[] = []) {
  return scans.filter((scan) => scan.status === 'completed');
}

function migrateLegacyAppData(parsed: Partial<AppDataState>, userId: string): AppDataState {
  let farms: Farm[] = parsed.farms ?? [];
  let selectedFarmId = parsed.selectedFarmId ?? null;

  if (farms.length === 0 && parsed.farmProfile) {
    const legacyFarm = farmFromProfile(parsed.farmProfile, `farm_${userId}`);
    farms = [legacyFarm];
    selectedFarmId = legacyFarm.id;
  }

  selectedFarmId = resolveSelectedFarmId(farms, selectedFarmId);

  let fields = parsed.fields ?? [];
  if (selectedFarmId) {
    fields = assignFieldsToFarm(fields, selectedFarmId);
  }

  const { farmProfile: _legacyFarmProfile, ...rest } = parsed;

  return {
    ...EMPTY_APP_DATA,
    ...rest,
    farms,
    selectedFarmId,
    fields,
    scans: completedScansOnly(parsed.scans),
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    subscription: { ...DEFAULT_SUBSCRIPTION, ...parsed.subscription },
  };
}

export async function loadAppData(userId: string): Promise<AppDataState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) {
      return {
        ...EMPTY_APP_DATA,
        settings: { ...DEFAULT_SETTINGS },
        subscription: { ...DEFAULT_SUBSCRIPTION },
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    return migrateLegacyAppData(parsed, userId);
  } catch {
    return {
      ...EMPTY_APP_DATA,
      settings: { ...DEFAULT_SETTINGS },
      subscription: { ...DEFAULT_SUBSCRIPTION },
    };
  }
}

export async function saveAppData(userId: string, data: AppDataState) {
  await AsyncStorage.setItem(
    storageKey(userId),
    JSON.stringify({ ...data, scans: completedScansOnly(data.scans) }),
  );
}

export async function clearAppData(userId: string) {
  await AsyncStorage.removeItem(storageKey(userId));
}
