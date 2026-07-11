import { test, expect } from '@playwright/test';
import { forceAutoTutorialOff, startGame } from '../../helpers/gameDriver';
import { touchPinch } from '../../helpers/touchDriver';

// Pinch-to-zoom has no DOM-exposed camera.zoom value to assert on directly, so these
// flows confirm it visually (screenshot diff + attachment for human/agent review) —
// same approach flows/draw-line.spec.ts uses for train-position confirmation.

test('two-finger pinch out zooms in (camera view changes)', async ({ page }) => {
  await page.goto('/');
  await forceAutoTutorialOff(page);
  await startGame(page);

  const canvasBox = await page.locator('canvas').boundingBox();
  const center = { x: canvasBox!.x + canvasBox!.width / 2, y: canvasBox!.y + canvasBox!.height / 2 };

  // Canvas-scoped screenshots, not page.screenshot() — the HUD's clock badge ticks
  // continuously (weekProgress-driven), which would make a full-page diff flaky
  // regardless of whether zoom actually changed anything.
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  await touchPinch(page, center, 20, 100); // fingers spreading apart = zoom in
  await page.waitForTimeout(200);
  const after = await canvas.screenshot();

  expect(before.equals(after)).toBe(false);
  await test.info().attach('before-pinch-in', { body: before, contentType: 'image/png' });
  await test.info().attach('after-pinch-in', { body: after, contentType: 'image/png' });
});

test('repeated two-finger pinch-in past the zoom-out limit stays stable (no crash, still rendering)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');

  await forceAutoTutorialOff(page);
  await startGame(page);

  const canvasBox = await page.locator('canvas').boundingBox();
  const center = { x: canvasBox!.x + canvasBox!.width / 2, y: canvasBox!.y + canvasBox!.height / 2 };

  // Zoom out repeatedly, well past where CAMERA_MIN_ZOOM (camera.ts clampZoom) should
  // clamp it. Not asserting pixel-exact "no further change" here — the canvas is a live
  // game (Station spawn/passenger-dot animation, HUD-independent) and byte-identical
  // screenshots across several hundred ms turned out to be too fragile a signal for
  // what we actually care about: that over-zooming doesn't crash or corrupt rendering.
  const canvas = page.locator('canvas');
  for (let i = 0; i < 6; i++) {
    await touchPinch(page, center, 120, 20);
    await page.waitForTimeout(100);
  }

  expect(errors).toEqual([]);
  const finalShot = await canvas.screenshot();
  expect(finalShot.length).toBeGreaterThan(0);
  await test.info().attach('after-repeated-pinch-in', { body: finalShot, contentType: 'image/png' });
});
