#!/usr/bin/env node
/**
 * Push EXPO_PUBLIC_* vars from .env to the linked Vercel project.
 * Run after: vercel login && vercel link
 *
 *   node scripts/sync-vercel-env.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const env = loadEnv(envPath);
const keys = Object.keys(env).filter((key) => key.startsWith('EXPO_PUBLIC_'));

if (keys.length === 0) {
  console.error('No EXPO_PUBLIC_* variables found in .env');
  process.exit(1);
}

console.log(`Syncing ${keys.length} EXPO_PUBLIC_* variables to Vercel (production, preview, development)...`);

for (const key of keys) {
  const value = env[key];
  if (!value) {
    console.warn(`Skipping empty ${key}`);
    continue;
  }

  if (key === 'EXPO_PUBLIC_ANALYSIS_API_URL' && /192\.168\.|10\.|127\.0\.0\.1|localhost/i.test(value)) {
    console.warn(
      `Skipping ${key} (${value}) — use a public HTTPS URL on Vercel, not a local/LAN address.`,
    );
    continue;
  }

  for (const target of ['production', 'preview', 'development']) {
    const result = spawnSync(
      'vercel',
      ['env', 'add', key, target, '--force'],
      { input: value, encoding: 'utf8', cwd: root },
    );
    if (result.status !== 0) {
      console.error(`Failed to set ${key} (${target}):`, result.stderr || result.stdout);
      process.exit(result.status ?? 1);
    }
  }
  console.log(`  ✓ ${key}`);
}

console.log('\nDone. Redeploy for changes to take effect: npm run deploy:vercel');
