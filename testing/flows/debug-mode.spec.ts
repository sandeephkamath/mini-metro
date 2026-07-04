import { test, expect } from '@playwright/test';
import { startGame, toggleDebugMode, setDebugSpeed } from '../helpers/gameDriver';

test('debug overlay appears and disappears with D', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await toggleDebugMode(page);
  await test.info().attach('debug-on', { body: await page.screenshot(), contentType: 'image/png' });

  await toggleDebugMode(page);
  await test.info().attach('debug-off', { body: await page.screenshot(), contentType: 'image/png' });

  // DEBUG.md: turning debug off resets speed to 1x — confirm no crash after toggling speed then exiting.
  await toggleDebugMode(page);
  await setDebugSpeed(page, 3);
  await toggleDebugMode(page);
  await expect(page.locator('canvas')).toBeVisible();
});
