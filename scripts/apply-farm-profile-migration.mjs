#!/usr/bin/env node
/**
 * Adds farm profile columns to public.profiles in Supabase.
 *
 * Option A — database URI (recommended):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@... npm run db:migrate-farm-profile
 *
 * Option B — Supabase Management API:
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run db:migrate-farm-profile
 *
 * Get the DB URI from Supabase Dashboard → Project Settings → Database → Connection string → URI
 * Get the access token from https://supabase.com/dashboard/account/tokens
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
  }
  return vars;
}

const env = { ...loadEnvFile(join(root, '.env')), ...process.env };
const migrationSql = readFileSync(join(root, 'supabase/add-farm-profile-columns.sql'), 'utf8');

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function runViaManagementApi() {
  const token = env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRefFromUrl(env.EXPO_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL);
  if (!token || !ref) return false;

  console.log(`Running migration via Supabase Management API (project ${ref})…`);

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: migrationSql }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Management API failed (${response.status}): ${body}`);
  }

  console.log('Migration applied successfully via Management API.');
  return true;
}

async function runViaPostgres() {
  const dbUrl = env.SUPABASE_DB_URL;
  if (!dbUrl) return false;

  console.log('Running migration via direct Postgres connection…');

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query(migrationSql);
    console.log('Migration applied successfully via Postgres.');
    return true;
  } finally {
    await client.end();
  }
}

async function verifyColumns() {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const response = await fetch(
    `${url}/rest/v1/profiles?select=farm_name,primary_region,default_crop,preferred_units,approximate_acres,onboarding_complete&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (response.ok) {
    console.log('Verified: farm profile columns are visible to the API.');
    return;
  }

  const body = await response.text();
  console.warn('Verification warning:', body);
}

async function main() {
  if (await runViaManagementApi()) {
    await verifyColumns();
    return;
  }

  if (await runViaPostgres()) {
    await verifyColumns();
    return;
  }

  console.error(`
Could not run the migration automatically.

Add ONE of these to your .env file, then run:
  npm run db:migrate-farm-profile

1) SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   (Supabase Dashboard → Project Settings → Database → Connection string → URI)

2) SUPABASE_ACCESS_TOKEN=sbp_...
   (https://supabase.com/dashboard/account/tokens)

Or paste this SQL in Supabase Dashboard → SQL Editor:
${migrationSql}
`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
