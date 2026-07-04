import { test, expect } from '@playwright/test';
import {
  FIXED_STATIONS,
  debugAddPassenger,
  getPhase,
  getScoreAndWeek,
  restartGame,
  startGame,
  toggleDebugMode,
} from '../helpers/gameDriver';

test('restart from game over resets to a fresh playing state', async ({ page }) => {
  await page.goto('/');
  await startGame(page);
  await toggleDebugMode(page);

  const station = { ...FIXED_STATIONS.circle, shape: 'circle' as const };
  const destinations = ['triangle', 'square', 'triangle', 'square', 'triangle', 'square', 'triangle', 'square'] as const;
  for (const dest of destinations) {
    await debugAddPassenger(page, station, dest);
    if ((await getPhase(page)) === 'gameover') break;
  }

  test.skip((await getPhase(page)) !== 'gameover', 'overflow did not trigger game over — see overflow-gameover.spec.ts');

  await restartGame(page);
  expect(await getPhase(page)).toBe('playing');
  const { score, week } = await getScoreAndWeek(page);
  expect(score).toBe(0);
  expect(week).toBe(0);
});
