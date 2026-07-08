import { test, expect } from '@playwright/test';
import { getPhase, getScoreAndWeek, startGame } from '../helpers/gameDriver';

test('boot shows the home screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  expect(await getPhase(page)).toBe('home');
});

test('clicking Play goes directly to playing with score 0, week 0', async ({ page }) => {
  await page.goto('/');
  await startGame(page);
  expect(await getPhase(page)).toBe('playing');
  const { score, week } = await getScoreAndWeek(page);
  expect(score).toBe(0);
  expect(week).toBe(0);
});
