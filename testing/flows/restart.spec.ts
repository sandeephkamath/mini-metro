import { test, expect } from '@playwright/test';
import {
  FIXED_STATIONS,
  debugAddPassenger,
  forceAdUnavailable,
  forceAutoTutorialOff,
  getPhase,
  getScoreAndWeek,
  restartGame,
  setDebugSpeed,
  startGame,
  toggleDebugMode,
} from '../helpers/gameDriver';

// Forces the Ad Provider unavailable so overflow ends the game directly instead of
// offering the ad-gated Game-Over Continue (core/monetization.md §3) — this test is
// about restart, not the Continue flow. See overflow-gameover.spec.ts.
test('restart from game over resets to a fresh playing state', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);
  await toggleDebugMode(page);
  await forceAdUnavailable(page);

  const station = { ...FIXED_STATIONS.circle, shape: 'circle' as const };
  const destinations = ['triangle', 'square', 'triangle', 'square', 'triangle', 'square'] as const;
  for (const dest of destinations) {
    await debugAddPassenger(page, station, dest);
  }

  // Queue is at capacity — wait out the Risk Timer (core/logic.md §3 Node Overflow).
  await setDebugSpeed(page, 3);
  await page.waitForTimeout(3000);
  expect(await getPhase(page)).toBe('gameover');

  await restartGame(page);
  expect(await getPhase(page)).toBe('playing');
  const { score, week } = await getScoreAndWeek(page);
  expect(score).toBe(0);
  expect(week).toBe(0);
});
