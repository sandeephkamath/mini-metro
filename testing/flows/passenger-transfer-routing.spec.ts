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

// Builds two lines sharing `triangle` as a transfer station:
//   Line A: circle -> triangle
//   Line B: square -> triangle   (square is unattached, so this starts a new line
//                                 and ends on triangle, making triangle a transfer node)
async function buildTransferNetwork(page: Parameters<typeof drawLine>[0]) {
  await drawLine(page, FIXED_STATIONS.circle, FIXED_STATIONS.triangle);
  await drawLine(page, FIXED_STATIONS.square, FIXED_STATIONS.triangle);
}

// core/logic.md §3 Routing rule 3 (one-hop transfer): destination isn't on the boarding
// train's own route, but a future stop (triangle) has a connecting line (B) that goes
// there directly — passenger should board anyway and transfer at triangle.
test('a passenger reachable only via one connecting line gets delivered through the transfer', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);

  // Both lines must be drawn before debug mode is enabled — see the note in
  // passenger-direct-delivery.spec.ts on why drags don't work once debug mode is on.
  await buildTransferNetwork(page);

  await toggleDebugMode(page);
  await toggleStationSpawn(page);
  await togglePassengerSpawn(page);

  // Origin: circle, on line A only. Destination: square, only reachable via line B at triangle.
  await debugAddPassenger(page, { ...FIXED_STATIONS.circle, shape: 'circle' }, 'square');

  // Same "train starts already departing" delay as the direct-delivery case applies at
  // circle, plus a transfer leg at triangle and the ride on to square.
  const finalScore = await waitForScoreAtLeast(page, 1, 25_000);
  await test.info().attach('final-state', { body: await page.screenshot(), contentType: 'image/png' });
  expect(finalScore).toBe(1);
});

// core/logic.md §3 Routing rule 2 (anti-bounce): passenger is waiting AT the transfer
// station itself. Line A (the one currently trying to board them) doesn't go to their
// destination, but line B — also present at this same station — does directly. The
// passenger must refuse line A's train and hold out for line B's. If anti-bounce were
// broken, the passenger would board line A and shuttle circle<->triangle forever,
// never reaching square, and this test would time out.
test('a passenger at a transfer station waits for the connecting line instead of boarding the wrong train', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);

  await buildTransferNetwork(page);

  await toggleDebugMode(page);
  await toggleStationSpawn(page);
  await togglePassengerSpawn(page);

  // Origin: triangle itself (shape triangle), which belongs to both line A and line B.
  await debugAddPassenger(page, { ...FIXED_STATIONS.triangle, shape: 'triangle' }, 'square');

  const finalScore = await waitForScoreAtLeast(page, 1, 25_000);
  await test.info().attach('final-state', { body: await page.screenshot(), contentType: 'image/png' });
  expect(finalScore).toBe(1);
});
