import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppDataState } from '../types/models';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUBSCRIPTION,
} from '../types/models';

const STORAGE_PREFIX = 'thera_app_data_';

export function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export const EMPTY_APP_DATA: AppDataState = {
  onboardingComplete: false,
  farmProfile: null,
  fields: [],
  scans: [],
  reports: [],
  settings: DEFAULT_SETTINGS,
  subscription: DEFAULT_SUBSCRIPTION,
  costAssumptions: null,
};

export async function loadAppData(userId: string): Promise<AppDataState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY_APP_DATA, settings: { ...DEFAULT_SETTINGS }, subscription: { ...DEFAULT_SUBSCRIPTION } };
    const parsed = JSON.parse(raw) as AppDataState;
    return {
      ...EMPTY_APP_DATA,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      subscription: { ...DEFAULT_SUBSCRIPTION, ...parsed.subscription },
    };
  } catch {
    return { ...EMPTY_APP_DATA, settings: { ...DEFAULT_SETTINGS }, subscription: { ...DEFAULT_SUBSCRIPTION } };
  }
}

export async function saveAppData(userId: string, data: AppDataState) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(data));
}

export async function clearAppData(userId: string) {
  await AsyncStorage.removeItem(storageKey(userId));
}
