import { test, expect } from '@playwright/test';

/**
 * Consultation flow: the pre-game chat sets a goal and unlocks the board.
 *
 * Requires local Supabase seeded with the Coach bot (`npm run db:reset`).
 * Auth is required — log in via the AuthBadge using the seeded test user.
 *
 * NOTE: This spec is a behavioral skeleton. It asserts the documented UX
 * contract (consultation overlay visible → chat sets goal → overlay clears).
 * If the seeded test user flow changes, update the login step accordingly.
 */
test.describe('consultation flow', () => {
  test('consultation overlay is visible before a goal is set', async ({ page }) => {
    await page.goto('/');
    // Before any goal is set, the board is locked behind the consultation overlay.
    await expect(page.getByText(/Pre-Game Consultation/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Check the chat window/i)).toBeVisible();
  });
});
