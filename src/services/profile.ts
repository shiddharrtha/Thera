import type { AuthUser } from './auth';
import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { FarmProfile, Units } from '../types/models';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshFirebaseToken(force = true) {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
}

function rowToFarmProfile(row: {
  farm_name: string | null;
  primary_region: string | null;
  default_crop: string | null;
  preferred_units: string | null;
  approximate_acres: number | null;
}): FarmProfile | null {
  if (!row.farm_name?.trim()) return null;

  return {
    farmName: row.farm_name.trim(),
    region: row.primary_region?.trim() || 'Iowa',
    defaultCrop: row.default_crop?.trim() || 'Soybean',
    units: (row.preferred_units === 'metric' ? 'metric' : 'imperial') as Units,
    approximateAcres: Number(row.approximate_acres) || 0,
  };
}

export function getProfileSaveErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : 'Could not save farm profile.';

  if (
    code === 'PGRST204' ||
    code === '42703' ||
    /farm_name|primary_region|default_crop|preferred_units|approximate_acres|onboarding_complete|expo_push_token/i.test(
      message,
    )
  ) {
    return 'Farm profile columns are missing in Supabase. Run: npm run db:migrate-farm-profile (add SUPABASE_DB_URL to .env first).';
  }

  if (code === '42501') {
    return 'Database permissions blocked the save. Run supabase/fix-firebase-rls.sql in Supabase.';
  }

  if (code === 'PGRST301') {
    return 'Could not authenticate with Supabase. Check Firebase is linked in Supabase settings.';
  }

  return message;
}

async function upsertFarmProfileRow(
  user: AuthUser,
  profile: FarmProfile,
  fullName?: string | null,
) {
  const email = user.email;
  if (!email) throw new Error('Missing email for profile save.');

  const resolvedName = fullName?.trim() || user.displayName?.trim() || null;

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.uid,
      email,
      full_name: resolvedName,
      farm_name: profile.farmName.trim() || null,
      primary_region: profile.region,
      default_crop: profile.defaultCrop,
      preferred_units: profile.units,
      approximate_acres: profile.approximateAcres,
      onboarding_complete: true,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

/** Persist farm setup fields to the Supabase profiles table. */
export async function saveFarmProfile(
  user: AuthUser,
  profile: FarmProfile,
  fullName?: string | null,
) {
  const delays = [0, 1500, 3000, 5000, 8000];
  let lastError: unknown;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    await refreshFirebaseToken(true);

    try {
      await upsertFarmProfileRow(user, profile, fullName);
      return;
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[profile] save farm profile attempt failed', error);
      }
    }
  }

  throw lastError ?? new Error('Could not save farm profile.');
}

/** Load farm setup fields from Supabase for the signed-in user. */
export async function fetchFarmProfile(userId: string): Promise<{
  farmProfile: FarmProfile | null;
  onboardingComplete: boolean;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'farm_name, primary_region, default_crop, preferred_units, approximate_acres, onboarding_complete',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { farmProfile: null, onboardingComplete: false };

  return {
    farmProfile: rowToFarmProfile(data),
    onboardingComplete: Boolean(data.onboarding_complete),
  };
}
