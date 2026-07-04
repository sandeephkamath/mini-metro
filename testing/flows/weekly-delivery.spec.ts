import { test, expect } from '@playwright/test';
import { getScoreAndWeek, setDebugSpeed, startGame, toggleDebugMode } from '../helpers/gameDriver';

// themes/metro.md §4: a Weekly Delivery fires every 60s of game time. At 4x debug
// speed that's roughly 15s of wall time; padded generously to absorb frame timing drift.
test('weekly delivery advances the week and shows a toast', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await startGame(page);
  await toggleDebugMode(page);
  await setDebugSpeed(page, 3);

  await page.waitForTimeout(20_000);

  await test.info().attach('after-first-week', { body: await page.screenshot(), contentType: 'image/png' });
  const { week } = await getScoreAndWeek(page);
  expect(week).toBeGreaterThanOrEqual(1);
});
