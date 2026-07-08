import { test, expect } from '@playwright/test';
import { setDebugSpeed, startGame, toggleDebugMode, togglePassengerSpawn, waitForWeekAtLeast } from '../helpers/gameDriver';

// themes/metro.md §4: a Weekly Upgrade (Milestone Event) fires every 5 weeks (300s of
// game time). Metro's bonus mode is Choice, so it pauses and offers 3 options.
// setDebugSpeed(page, 3) presses the '3' key, which DEBUG.md maps to the 4x "Very fast"
// speed (not literally 3x) — 300s of game time elapses in ~75s wall time. Poll for week 5
// (waitForWeekAtLeast) rather than a single fixed wait, since exactly how much real time a
// given amount of debug-sped-up game time takes isn't perfectly exact (frame overhead) —
// padded generously past the nominal ~75s.
//
// No Line is ever drawn in this test, so passenger spawning must be paused (there's no
// train to evacuate a station's queue otherwise) — without this, a station reliably
// overflows and ends the game (Game Over) well before the 5-week milestone can fire,
// since the Risk Timer (8s) is far shorter than the time this test needs to run.
test('weekly upgrade advances the week and offers a choice', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await startGame(page);
  await toggleDebugMode(page);
  await togglePassengerSpawn(page);
  await setDebugSpeed(page, 3);

  const week = await waitForWeekAtLeast(page, 5, 100_000);

  await test.info().attach('after-fifth-week', { body: await page.screenshot(), contentType: 'image/png' });
  expect(week).toBeGreaterThanOrEqual(5);

  const newTrainOption = page.getByText('New Train', { exact: true });
  await expect(newTrainOption).toBeVisible();
  await newTrainOption.click();
  await expect(newTrainOption).not.toBeVisible();

  await test.info().attach('after-choice', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(page.getByTestId('hud-depot-carrier')).toContainText('×1');
});
