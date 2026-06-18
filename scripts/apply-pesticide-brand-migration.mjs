#!/usr/bin/env node
/**
 * Adds pesticide_brand to public.profiles.
 *   npm run db:migrate-pesticide-brand
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
const migrationSql = readFileSync(join(root, 'supabase/add-pesticide-brand-column.sql'), 'utf8');

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

async function main() {
  if (await runViaPostgres()) return;

  console.error(`
Could not run the migration automatically.

Add SUPABASE_DB_URL to .env, then run:
  npm run db:migrate-pesticide-brand

Or paste this SQL in Supabase Dashboard → SQL Editor:
${migrationSql}
`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
