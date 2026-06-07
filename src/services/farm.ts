import type { AuthUser } from './auth';
import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { Farm, FarmProfile, Units } from '../types/models';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshFirebaseToken(force = true) {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
}

type FarmRow = {
  id: string;
  user_id: string;
  name: string;
  primary_region: string | null;
  default_crop: string | null;
  preferred_units: string | null;
  approximate_acres: number | null;
  created_at: string;
  updated_at: string;
};

function rowToFarm(row: FarmRow): Farm {
  return {
    id: row.id,
    name: row.name,
    region: row.primary_region?.trim() || 'Iowa',
    defaultCrop: row.default_crop?.trim() || 'Soybean',
    units: (row.preferred_units === 'metric' ? 'metric' : 'imperial') as Units,
    approximateAcres: Number(row.approximate_acres) || 0,
    createdAt: row.created_at,
  };
}

function farmToRow(farm: Farm, userId: string): FarmRow {
  return {
    id: farm.id,
    user_id: userId,
    name: farm.name.trim() || 'My Farm',
    primary_region: farm.region,
    default_crop: farm.defaultCrop,
    preferred_units: farm.units,
    approximate_acres: farm.approximateAcres,
    created_at: farm.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getFarmSaveErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not save farm.';

  if (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '42P01' ||
    /farms|farm_id|selected_farm_id/i.test(message)
  ) {
    return 'Farms table is missing. Run: npm run db:migrate-farms (add SUPABASE_DB_URL to .env first).';
  }

  if (code === '42501') {
    return 'Database permissions blocked the save. Run supabase/fix-firebase-rls.sql in Supabase.';
  }

  return message;
}

async function withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [0, 1500, 3000, 5000];
  let lastError: unknown;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    await refreshFirebaseToken(true);
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[farm] operation failed', error);
      }
    }
  }

  throw lastError ?? new Error('Could not complete farm operation.');
}

/** Load all farms for a user. */
export async function fetchFarms(userId: string): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as FarmRow[]).map(rowToFarm);
}

/** Load the user's selected farm id from profiles. */
export async function fetchSelectedFarmId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('selected_farm_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.selected_farm_id ?? null;
}

/** Persist selected farm on the user profile. */
export async function saveSelectedFarmId(user: AuthUser, farmId: string) {
  return withAuthRetry(async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ selected_farm_id: farmId })
      .eq('id', user.uid);

    if (error) throw error;
  });
}

/** Create a new farm row. */
export async function createFarmRemote(user: AuthUser, farm: Farm): Promise<Farm> {
  return withAuthRetry(async () => {
    const row = farmToRow(farm, user.uid);
    const { data, error } = await supabase.from('farms').insert(row).select('*').single();
    if (error) throw error;
    return rowToFarm(data as FarmRow);
  });
}

/** Update an existing farm. */
export async function updateFarmRemote(user: AuthUser, farm: Farm): Promise<Farm> {
  return withAuthRetry(async () => {
    const row = farmToRow(farm, user.uid);
    const { data, error } = await supabase
      .from('farms')
      .update({
        name: row.name,
        primary_region: row.primary_region,
        default_crop: row.default_crop,
        preferred_units: row.preferred_units,
        approximate_acres: row.approximate_acres,
        updated_at: row.updated_at,
      })
      .eq('id', farm.id)
      .eq('user_id', user.uid)
      .select('*')
      .single();

    if (error) throw error;
    return rowToFarm(data as FarmRow);
  });
}

/** Mark onboarding complete and sync legacy profile farm columns. */
export async function saveOnboardingFarm(
  user: AuthUser,
  farm: Farm,
  fullName?: string | null,
) {
  return withAuthRetry(async () => {
    const email = user.email;
    if (!email) throw new Error('Missing email for profile save.');

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.uid,
        email,
        full_name: fullName?.trim() || user.displayName?.trim() || null,
        farm_name: farm.name,
        primary_region: farm.region,
        default_crop: farm.defaultCrop,
        preferred_units: farm.units,
        approximate_acres: farm.approximateAcres,
        selected_farm_id: farm.id,
        onboarding_complete: true,
      },
      { onConflict: 'id' },
    );

    if (error) throw error;
  });
}

/** Convert legacy onboarding form data to a Farm entity. */
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

/** Convert Farm to legacy FarmProfile shape. */
export function farmToProfile(farm: Farm): FarmProfile {
  return {
    farmName: farm.name,
    region: farm.region,
    defaultCrop: farm.defaultCrop,
    units: farm.units,
    approximateAcres: farm.approximateAcres,
  };
}

/** Build a farm from legacy profile columns when farms table is empty. */
export function farmFromLegacyProfile(userId: string, profile: FarmProfile): Farm {
  return farmFromProfile(profile, `farm_${userId}`);
}
