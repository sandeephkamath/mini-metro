import { test, expect } from '@playwright/test';
import {
  FIXED_STATIONS,
  debugAddPassenger,
  drawLine,
  forceAutoTutorialOff,
  startGame,
  toggleDebugMode,
  toggleStationSpawn,
  togglePassengerSpawn,
  waitForScoreAtLeast,
} from '../helpers/gameDriver';

// core/logic.md §3 Routing rule 1: if the destination is a future stop on the train's own
// route, the passenger boards and rides straight there. This is the simplest "should
// definitely get picked up" case — nothing to wait on.
test('a passenger whose destination is the very next stop gets delivered', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);

  // Draw the line BEFORE enabling debug mode: while debug mode is on, every canvas
  // mousedown is routed to the debug popup handler (mouseHandler.ts onMouseDown),
  // so a drag never starts a line — it just opens/closes the passenger picker.
  await drawLine(page, FIXED_STATIONS.circle, FIXED_STATIONS.triangle);

  await toggleDebugMode(page);
  await toggleStationSpawn(page); // keep the scenario deterministic — no extra stations/passengers
  await togglePassengerSpawn(page);

  await debugAddPassenger(
    page,
    { ...FIXED_STATIONS.circle, shape: 'circle' },
    'triangle',
  );

  // Generous timeout: this line's train is created already departing circle (see
  // trains.ts createTrain — state 'moving', not 'stopped'), so it does NOT board this
  // waiting passenger until it completes a full round trip back to circle. Budget for
  // that lap (~2 legs + 2 stops) plus the final ride to triangle.
  const finalScore = await waitForScoreAtLeast(page, 1, 15_000);
  await test.info().attach('final-state', { body: await page.screenshot(), contentType: 'image/png' });
  expect(finalScore).toBe(1);
});
