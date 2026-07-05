import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, canvasPoint, getCanvasPixel, startGame } from '../../helpers/gameDriver';
import { touchDrag, touchPan } from '../../helpers/touchDriver';

// Runs only under the `mobile` Playwright project (devices['iPhone 13'], hasTouch/isMobile) —
// see testing/playwright.config.ts. Confirms the responsive stage fits the viewport and that
// single-touch drag draws a Line exactly like a mouse drag does in flows/draw-line.spec.ts.

test('game stage fits the mobile viewport without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const viewport = page.viewportSize()!;
  const canvasBox = await page.locator('canvas').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(canvasBox!.height).toBeLessThanOrEqual(viewport.height);

  const bodyOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(bodyOverflowX).toBe(false);
});

test('single-finger touch drag draws a line between stations', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const from = await canvasPoint(page, FIXED_STATIONS.circle.x, FIXED_STATIONS.circle.y);
  const to = await canvasPoint(page, FIXED_STATIONS.triangle.x, FIXED_STATIONS.triangle.y);
  await touchDrag(page, from, to);
  await page.waitForTimeout(200);

  const a = FIXED_STATIONS.circle;
  const b = FIXED_STATIONS.triangle;
  const dx = b.x - a.x, dy = b.y - a.y;
  const onLeg = { x: Math.round(a.x + Math.sign(dx) * 40), y: Math.round(a.y + Math.sign(dy) * 40) };
  const [r, g, b2] = await getCanvasPixel(page, onLeg.x, onLeg.y);
  expect([r, g, b2]).toEqual([231, 76, 60]); // first unlocked Line color (CONFIG.LINE_COLORS[0])
});

test('one-finger drag on empty map space pans the camera', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const before = await page.screenshot();
  // Drag from a point with no station nearby (empty map space) to pan.
  const start = await canvasPoint(page, 700, 500);
  const end = await canvasPoint(page, 500, 350);
  await touchDrag(page, start, end, 8);
  await page.waitForTimeout(200);
  const after = await page.screenshot();

  expect(before.equals(after)).toBe(false);
  await test.info().attach('before-pan', { body: before, contentType: 'image/png' });
  await test.info().attach('after-pan', { body: after, contentType: 'image/png' });
});
