import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 *
 * E2E is OPT-IN and not part of `npm run verify`. Run with `npm run test:e2e`.
 *
 * Prerequisites (see ENGINEERING_PLAN §4.3):
 *   1. Local Supabase running: `supabase start`
 *   2. `.env.local` pointing at local Supabase (NEXT_PUBLIC_SUPABASE_URL, etc.)
 *   3. `npm run db:reset` for a clean, seeded DB state.
 *
 * The webServer below boots `npm run dev` on port 3000 and reuses an existing
 * instance if one is already running.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
