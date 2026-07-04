import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, debugAddPassenger, getPhase, startGame, toggleDebugMode } from '../helpers/gameDriver';

// core/logic.md §3 Node Overflow: game ends immediately once a station's queue
// exceeds its max capacity (CONFIG.STATION_INITIAL_CAPACITY, 6 per themes/metro.md §5).
test('station overflow ends the game', async ({ page }) => {
  await page.goto('/');
  await startGame(page);
  await toggleDebugMode(page);

  const station = { ...FIXED_STATIONS.circle, shape: 'circle' as const };
  // Alternate destinations since a passenger's destination must differ from the station's own shape.
  const destinations = ['triangle', 'square', 'triangle', 'square', 'triangle', 'square', 'triangle', 'square'] as const;

  for (const dest of destinations) {
    await debugAddPassenger(page, station, dest);
    const phase = await getPhase(page);
    if (phase === 'gameover') break;
  }

  await test.info().attach('final-state', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await getPhase(page)).toBe('gameover');
});
