import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';

export type AuthUser = FirebaseAuthTypes.User;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Refresh token so Supabase receives the `role: authenticated` Firebase custom claim. */
async function refreshFirebaseToken(force = true) {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
}

async function upsertProfile(userId: string, email: string, fullName: string) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName || null,
    },
    { onConflict: 'id' },
  );

  if (error) {
    if (__DEV__) {
      console.warn('[auth] profile upsert error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    throw error;
  }
}

/**
 * Cloud Function sets the role claim asynchronously — retry while waiting for
 * a Firebase JWT that Supabase accepts as `authenticated`.
 */
async function upsertProfileWithRetry(userId: string, email: string, fullName: string) {
  const delays = [0, 1500, 3000, 5000, 8000, 12000];
  let lastError: unknown;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    await refreshFirebaseToken(true);

    try {
      await upsertProfile(userId, email, fullName);
      return;
    } catch (error) {
      lastError = error;
      if (__DEV__) {
        console.warn('[auth] profile upsert retry failed', error);
      }
    }
  }

  const detail =
    lastError && typeof lastError === 'object' && 'message' in lastError
      ? String((lastError as { message: string }).message)
      : 'Unknown error';

  throw new Error(`Could not save your profile (${detail}). Try signing in again.`);
}

/** Create or update the Supabase profile for the current Firebase user. */
export async function ensureProfile(user: AuthUser) {
  const email = user.email;
  if (!email) return;

  await refreshFirebaseToken(true);

  const { data } = await supabase.from('profiles').select('id').eq('id', user.uid).maybeSingle();
  if (data) return;

  await upsertProfileWithRetry(user.uid, email, user.displayName ?? '');
}

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case '42501':
      return 'Profile save blocked by database permissions. Run supabase/fix-firebase-rls.sql in Supabase.';
    case 'PGRST301':
      return 'Could not authenticate with Supabase. Check Firebase is linked in Supabase settings.';
    default:
      if (error instanceof Error) return error.message;
      return 'Something went wrong. Please try again.';
  }
}

export async function signUp(email: string, password: string, fullName: string) {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

  const { user } = await firebaseAuth().createUserWithEmailAndPassword(trimmedEmail, password);

  try {
    if (trimmedName) {
      await user.updateProfile({ displayName: trimmedName });
    }

    await upsertProfileWithRetry(user.uid, user.email ?? trimmedEmail, trimmedName);
  } catch (error) {
    try {
      await user.delete();
    } catch {
      // User may need to sign in and retry if rollback fails.
    }
    throw error;
  }

  return user;
}

export async function signIn(email: string, password: string) {
  const { user } = await firebaseAuth().signInWithEmailAndPassword(email.trim(), password);
  await refreshFirebaseToken(true);
  await ensureProfile(user);
  return user;
}

export async function signOut() {
  await firebaseAuth().signOut();
}

export function onAuthStateChanged(callback: (user: AuthUser | null) => void) {
  return firebaseAuth().onAuthStateChanged(callback);
}
