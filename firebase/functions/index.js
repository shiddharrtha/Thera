const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();

const AUTHENTICATED_CLAIM = { role: 'authenticated' };

/**
 * Creates the Supabase profile with the service role key (bypasses RLS).
 * Set in Firebase Console → Functions → Environment variables:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role secret key>
 */
async function createSupabaseProfile(user) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — profile row not created server-side',
    );
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: user.uid,
      email: user.email ?? '',
      full_name: user.displayName?.trim() || null,
    }),
  });

  if (response.ok) {
    return;
  }

  const body = await response.text();
  console.error('Supabase profile insert failed', response.status, body);
}

/**
 * Sets Supabase auth claim on signup. Profile row (with name) is written from the app
 * after displayName is set — onCreate runs before the client can update the profile.
 */
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
  await getAuth().setCustomUserClaims(user.uid, AUTHENTICATED_CLAIM);
  // Optional early row (email only); client upsert fills full_name after registration.
  await createSupabaseProfile(user);
});

const passwordReset = require('./passwordReset');
exports.requestPasswordResetOtp = passwordReset.requestPasswordResetOtp;
exports.confirmPasswordResetOtp = passwordReset.confirmPasswordResetOtp;
