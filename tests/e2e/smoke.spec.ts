import { test, expect } from '@playwright/test';

/**
 * Smoke test: the app boots and renders the main shell.
 *
 * Requires local Supabase + `.env.local` (see playwright.config.ts header).
 * Run: `npm run test:e2e`
 */
test.describe('app smoke', () => {
  test('home page responds 200 and renders the game shell', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // The shell renders one of the persistent panel headings regardless of
    // auth/consultation state. Wait generously — Supabase bootstraps on load.
    await expect(page.getByText('Move History')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Coach's Voice")).toBeVisible();
  });
});
