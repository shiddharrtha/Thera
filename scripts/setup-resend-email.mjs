#!/usr/bin/env node
/**
 * Configures Resend for password-reset emails and deploys Cloud Functions.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx RESEND_FROM="Thera <noreply@yourdomain.com>" node scripts/setup-resend-email.mjs
 *
 * Or paste keys into firebase/functions/.env (see .env.example) and run:
 *   node scripts/setup-resend-email.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, 'firebase/functions/.env');

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

function writeEnvFile(vars) {
  const lines = [
    '# Resend — password reset OTP emails',
    `RESEND_API_KEY=${vars.RESEND_API_KEY}`,
    `RESEND_FROM=${vars.RESEND_FROM}`,
    '',
    '# Do not expose OTP in API responses when email is configured',
    'THERA_EXPOSE_OTP=false',
    '',
  ];
  writeFileSync(envPath, lines.join('\n'));
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const fileVars = loadEnvFile(envPath);
const apiKey = process.env.RESEND_API_KEY || fileVars.RESEND_API_KEY;
const from =
  process.env.RESEND_FROM ||
  fileVars.RESEND_FROM ||
  'Thera <onboarding@resend.dev>';

if (!apiKey || !apiKey.startsWith('re_')) {
  console.error(`
Missing RESEND_API_KEY.

1. Sign up at https://resend.com
2. Create an API key at https://resend.com/api-keys
3. Run:

   RESEND_API_KEY=re_your_key RESEND_FROM="Thera <onboarding@resend.dev>" node scripts/setup-resend-email.mjs

Until you verify a domain, use RESEND_FROM="Thera <onboarding@resend.dev>"
and Resend will only deliver to the email address on your Resend account.
`);
  process.exit(1);
}

console.log('Validating Resend API key...');
const testRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: ['delivered@resend.dev'],
    subject: 'Thera email configuration test',
    text: 'If you receive this, Resend is configured correctly.',
  }),
});

if (!testRes.ok) {
  const body = await testRes.text();
  console.error('Resend API test failed:', testRes.status, body);
  process.exit(1);
}

console.log('Resend API key is valid.');
writeEnvFile({ RESEND_API_KEY: apiKey, RESEND_FROM: from });

console.log('Deploying password-reset functions...');
run('firebase', ['deploy', '--only', 'functions:requestPasswordResetOtp,functions:confirmPasswordResetOtp']);

console.log(`
Done. Password reset emails are configured.

  From: ${from}
  Env:  firebase/functions/.env (deployed with functions)

Test in the app: Forgot password → Send code
`);
