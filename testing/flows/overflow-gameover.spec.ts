import { test, expect } from '@playwright/test';
import {
  FIXED_STATIONS,
  debugAddPassenger,
  forceAdUnavailable,
  forceAutoTutorialOff,
  getPhase,
  setDebugSpeed,
  startGame,
  toggleDebugMode,
} from '../helpers/gameDriver';

// core/logic.md §3 Node Overflow: reaching capacity starts a Grace Timer (Overflow
// Risk) rather than ending the game immediately — the game only ends once that
// timer expires while the station is still at/over capacity (core/progression.md §5,
// themes/metro.md §5: Risk Timer base duration 8000ms).
//
// Forces the Ad Provider unavailable first so this test exercises the plain
// overflow → gameover transition itself, not the separate ad-gated Game-Over
// Continue (core/monetization.md §3) that would otherwise intercept it with a
// "Watch an ad to continue?" prompt instead of ending the game.
test('station overflow ends the game after the Risk Timer expires', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);
  await toggleDebugMode(page);
  await forceAdUnavailable(page);

  const station = { ...FIXED_STATIONS.circle, shape: 'circle' as const };
  // Alternate destinations since a passenger's destination must differ from the station's own shape.
  const destinations = ['triangle', 'square', 'triangle', 'square', 'triangle', 'square'] as const;

  for (const dest of destinations) {
    await debugAddPassenger(page, station, dest);
  }

  // Queue is now at capacity (6) — Overflow Risk should have started, but the
  // game must still be playing until the Risk Timer runs out.
  expect(await getPhase(page)).toBe('playing');

  await setDebugSpeed(page, 3); // 4x — Risk Timer base (8000ms) elapses in ~2s
  await page.waitForTimeout(3000);

  await test.info().attach('final-state', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await getPhase(page)).toBe('gameover');
});
