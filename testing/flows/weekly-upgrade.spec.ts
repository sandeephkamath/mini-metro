import { test, expect } from '@playwright/test';
import { getScoreAndWeek, setDebugSpeed, startGame, toggleDebugMode } from '../helpers/gameDriver';

// themes/metro.md §4: a Weekly Upgrade (Milestone Event) fires every 60s of game
// time. Metro's bonus mode is Choice, so it pauses and offers 3 options. At 4x
// debug speed 60s elapses in ~15s wall time; padded generously for frame drift.
test('weekly upgrade advances the week and offers a choice', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await startGame(page);
  await toggleDebugMode(page);
  await setDebugSpeed(page, 3);

  await page.waitForTimeout(20_000);

  await test.info().attach('after-first-week', { body: await page.screenshot(), contentType: 'image/png' });
  const { week } = await getScoreAndWeek(page);
  expect(week).toBeGreaterThanOrEqual(1);

  const newTrainOption = page.getByText('New Train', { exact: true });
  await expect(newTrainOption).toBeVisible();
  await newTrainOption.click();
  await expect(newTrainOption).not.toBeVisible();

  await test.info().attach('after-choice', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(page.getByText('🚆 ×1', { exact: false })).toBeVisible();
});
