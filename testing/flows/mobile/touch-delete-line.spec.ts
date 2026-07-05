import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, canvasPoint, getCanvasPixel, startGame } from '../../helpers/gameDriver';
import { touchDrag, touchHold } from '../../helpers/touchDriver';

// Confirms the HUD legend swatch's hold-to-delete gesture (HUD.tsx onTouchStart/onTouchEnd)
// works via real touch dispatch, not just onClick — see
// specs/mini_metro_original_analysis_2_ui_timing.md §5 for the gesture this mirrors.

test('holding the line legend swatch via touch deletes that line', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const from = await canvasPoint(page, FIXED_STATIONS.circle.x, FIXED_STATIONS.circle.y);
  const to = await canvasPoint(page, FIXED_STATIONS.triangle.x, FIXED_STATIONS.triangle.y);
  await touchDrag(page, from, to);
  await page.waitForTimeout(200);

  const a = FIXED_STATIONS.circle;
  const b = FIXED_STATIONS.triangle;
  const onLeg = { x: Math.round(a.x + Math.sign(b.x - a.x) * 40), y: Math.round(a.y + Math.sign(b.y - a.y) * 40) };
  const beforePixel = await getCanvasPixel(page, onLeg.x, onLeg.y);
  expect([beforePixel[0], beforePixel[1], beforePixel[2]]).toEqual([231, 76, 60]); // line drawn

  const swatch = page.locator('[data-testid="hud-line-swatch-l1"]');
  const box = await swatch.boundingBox();
  expect(box).not.toBeNull();
  await touchHold(page, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }, 700); // > DELETE_HOLD_MS (600ms)
  await page.waitForTimeout(200);

  const afterPixel = await getCanvasPixel(page, onLeg.x, onLeg.y);
  expect([afterPixel[0], afterPixel[1], afterPixel[2]]).not.toEqual([231, 76, 60]); // line gone
});

test('a short touch (below the hold threshold) cancels and does not delete the line', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const from = await canvasPoint(page, FIXED_STATIONS.circle.x, FIXED_STATIONS.circle.y);
  const to = await canvasPoint(page, FIXED_STATIONS.triangle.x, FIXED_STATIONS.triangle.y);
  await touchDrag(page, from, to);
  await page.waitForTimeout(200);

  const swatch = page.locator('[data-testid="hud-line-swatch-l1"]');
  const box = await swatch.boundingBox();
  await touchHold(page, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }, 200); // well under 600ms
  await page.waitForTimeout(200);

  const a = FIXED_STATIONS.circle;
  const b = FIXED_STATIONS.triangle;
  const onLeg = { x: Math.round(a.x + Math.sign(b.x - a.x) * 40), y: Math.round(a.y + Math.sign(b.y - a.y) * 40) };
  const pixel = await getCanvasPixel(page, onLeg.x, onLeg.y);
  // Not asserting the exact line color here: enough wall time has passed since drawing
  // that the Train (rendered as a darkened shade of the line color, renderTrains.ts)
  // may now be passing over this exact sample point instead of the plain stroke. Either
  // color confirms the line is still there — only the plain background color would mean
  // it got deleted.
  expect([pixel[0], pixel[1], pixel[2]]).not.toEqual([245, 240, 232]); // line (or its train) still there, not deleted
});
