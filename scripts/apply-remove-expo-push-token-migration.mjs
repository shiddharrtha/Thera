#!/usr/bin/env node
/**
 * Removes expo_push_token from public.profiles in Supabase.
 *   npm run db:remove-expo-push-token
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
const migrationSql = readFileSync(join(root, 'supabase/remove-expo-push-token.sql'), 'utf8');

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

  console.log('Removed expo_push_token column successfully via Management API.');
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
    console.log('Removed expo_push_token column successfully via Postgres.');
    return true;
  } finally {
    await client.end();
  }
}

async function main() {
  if (await runViaManagementApi()) return;
  if (await runViaPostgres()) return;

  console.error(`
Could not run the migration automatically.

Add SUPABASE_DB_URL to .env, then run:
  npm run db:remove-expo-push-token

Or paste this SQL in Supabase Dashboard → SQL Editor:
${migrationSql}
`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
