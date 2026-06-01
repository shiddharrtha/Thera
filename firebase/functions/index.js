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
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: user.uid,
      email: user.email ?? '',
      full_name: user.displayName ?? null,
    }),
  });

  if (response.ok || response.status === 409) {
    return;
  }

  const body = await response.text();
  console.error('Supabase profile insert failed', response.status, body);
}

/** Adds Supabase-required role claim and profile row when a Firebase user is created. */
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
  await getAuth().setCustomUserClaims(user.uid, AUTHENTICATED_CLAIM);
  await createSupabaseProfile(user);
});
