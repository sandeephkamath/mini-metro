import { test, expect } from '@playwright/test';
import { getPhase, getScoreAndWeek, startGame } from '../helpers/gameDriver';

test('boot shows the home screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Play', { exact: true })).toBeVisible();
  expect(await getPhase(page)).toBe('home');
});

test('home transitions to the start instructions overlay', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Play', { exact: true }).click();
  await expect(page.getByText('Start Game')).toBeVisible();
  expect(await getPhase(page)).toBe('start');
});

test('start transitions to playing with score 0, week 0', async ({ page }) => {
  await page.goto('/');
  await startGame(page);
  expect(await getPhase(page)).toBe('playing');
  const { score, week } = await getScoreAndWeek(page);
  expect(score).toBe(0);
  expect(week).toBe(0);
});
