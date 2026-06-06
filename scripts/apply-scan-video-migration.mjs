#!/usr/bin/env node
/**
 * Adds scan video columns (and optionally storage bucket) to Supabase.
 *
 *   SUPABASE_DB_URL=... npm run db:migrate-scan-video
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
const columnsSql = readFileSync(join(root, 'supabase/add-scan-video-columns.sql'), 'utf8');
const storageSql = readFileSync(join(root, 'supabase/add-scan-video-storage.sql'), 'utf8');

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function runQuery(sql, label) {
  const token = env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRefFromUrl(env.EXPO_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL);

  if (token && ref) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`${label} failed (${response.status}): ${body}`);
    return true;
  }

  const dbUrl = env.SUPABASE_DB_URL;
  if (!dbUrl) return false;

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
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
    `${url}/rest/v1/scans?select=video_url,video_duration_seconds,gps_track&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  if (response.ok) {
    console.log('Verified: scan video columns are visible to the API.');
    return;
  }

  console.warn('Verification warning:', await response.text());
}

async function main() {
  console.log('Applying scan video columns…');
  const columnsOk = await runQuery(columnsSql, 'Columns migration');
  if (!columnsOk) {
    console.error('Could not apply columns. Add SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN to .env');
    process.exit(1);
  }
  console.log('Scan video columns applied.');
  await runQuery("NOTIFY pgrst, 'reload schema'", 'Schema reload').catch(() => {});
  await verifyColumns();

  console.log('Applying scan-videos storage bucket + policies…');
  try {
    await runQuery(storageSql, 'Storage migration');
    console.log('Storage bucket and policies applied.');
  } catch (error) {
    console.warn(`
Storage setup could not run automatically (${error.message || error}).

Create the bucket manually in Supabase Dashboard → Storage → New bucket:
  Name: scan-videos
  Public: OFF

Then paste supabase/add-scan-video-storage.sql into SQL Editor and run it.
`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
