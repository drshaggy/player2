#!/usr/bin/env node
/**
 * Guard: refuse to run `npm run dev` if `.env.local` points at the production
 * Supabase project. Local dev must never mutate prod data.
 *
 * The prod URL substring is matched against NEXT_PUBLIC_SUPABASE_URL.
 * Override by setting ALLOW_PROD_DEV=1 (not recommended).
 */
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');
const prodHost = 'zdfscobeyhohhvgylhbh.supabase.co';

if (process.env.ALLOW_PROD_DEV === '1') {
  process.exit(0);
}

if (!fs.existsSync(envPath)) {
  console.warn('[dev-guard] .env.local not found — proceeding (Next.js will use .env defaults).');
  process.exit(0);
}

const env = fs.readFileSync(envPath, 'utf8');
const urlLine = env.split('\n').find((l) => l.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL='));

if (!urlLine) {
  console.warn('[dev-guard] NEXT_PUBLIC_SUPABASE_URL not set in .env.local — proceeding.');
  process.exit(0);
}

const url = urlLine.split('=')[1]?.trim().replace(/^['"]|['"]$/g, '');

if (url && url.includes(prodHost)) {
  console.error(
    `[dev-guard] ABORTING: .env.local points at the PRODUCTION Supabase project (${url}).\n` +
    `Local dev must never hit prod. Either:\n` +
    `  • run local Supabase (colima start && supabase start) and swap .env.local to http://127.0.0.1:54321, or\n` +
    `  • restore .env.local from .env.local.prod only if you intentionally mean to hit prod, then re-run with ALLOW_PROD_DEV=1.`
  );
  process.exit(1);
}

process.exit(0);
