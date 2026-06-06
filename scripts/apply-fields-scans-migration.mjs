#!/usr/bin/env node
/**
 * Creates fields, scans, and reports tables in Supabase.
 *
 * Option A — database URI (recommended):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@... npm run db:migrate-fields-scans
 *
 * Option B — Supabase Management API:
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run db:migrate-fields-scans
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
const migrationSql = readFileSync(join(root, 'supabase/add-fields-scans-tables.sql'), 'utf8');

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

  if (/pooler\.supabase\.com:5432/.test(dbUrl)) {
    console.warn(
      'Warning: pooler host with port 5432 often fails. Use port 6543 (Session pooler) or direct: db.[project-ref].supabase.co:5432',
    );
  }

  console.log('Running migration via direct Postgres connection…');

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query(migrationSql);
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Migration applied successfully via Postgres.');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/password authentication failed/i.test(message)) {
      console.error(`
Password authentication failed. Check:

1) Reset your database password in Supabase → Settings → Database → Reset password
2) Update SUPABASE_DB_URL in .env with the new password
3) Use the correct URI format (pick ONE):

   Direct (easiest for migrations):
   postgresql://postgres:YOUR_PASSWORD@db.pnmnfxnkqsbgsixtkggy.supabase.co:5432/postgres

   Session pooler (port must be 6543, not 5432):
   postgresql://postgres.pnmnfxnkqsbgsixtkggy:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres

4) If your password contains special characters (@ # / % etc.), URL-encode them
   (e.g. @ → %40, # → %23)
`);
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyTables() {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const response = await fetch(`${url}/rest/v1/fields?select=id&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (response.ok) {
    console.log('Verified: fields/scans/reports tables are visible to the API.');
    return;
  }

  const body = await response.text();
  console.warn('Verification warning:', body);
}

async function main() {
  if (await runViaManagementApi()) {
    await verifyTables();
    return;
  }

  if (await runViaPostgres()) {
    await verifyTables();
    return;
  }

  console.error(`
Could not run the migration automatically.

Add ONE of these to your .env file, then run:
  npm run db:migrate-fields-scans

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
