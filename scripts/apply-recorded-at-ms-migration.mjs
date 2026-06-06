#!/usr/bin/env node
/**
 * Adds recorded_at_ms columns to scans and reports.
 *
 *   SUPABASE_DB_URL=... npm run db:migrate-recorded-at-ms
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
const migrationSql = readFileSync(join(root, 'supabase/add-recorded-at-ms.sql'), 'utf8');

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function runQuery(sql) {
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
    if (!response.ok) throw new Error(body);
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

async function main() {
  console.log('Applying recorded_at_ms migration…');
  const ok = await runQuery(migrationSql);
  if (!ok) {
    console.error('Could not apply migration. Add SUPABASE_DB_URL to .env');
    process.exit(1);
  }
  console.log('Migration applied.');
  await runQuery("NOTIFY pgrst, 'reload schema'").catch(() => {});
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
