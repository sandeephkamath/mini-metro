import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, canvasPoint, getCanvasPixel, startGame } from '../../helpers/gameDriver';
import { touchDrag, touchHold, touchStart, touchEndKeeping } from '../../helpers/touchDriver';

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

// Regression test for a bug the game-tester agent found via real two-finger touch
// dispatch: HUD.tsx's hold-to-delete state used to be a single shared value, not
// per-Line, so a second swatch's touchstart silently overwrote the first swatch's
// timer tracking — releasing swatch A early (should cancel) actually deleted A late
// (its orphaned timer fired anyway), while holding swatch B past the threshold
// (should delete) got silently cancelled instead. See testing/reports/2026-07-06-mobile-touch-qa.md.
test('holding two different line swatches at once with two fingers is independent per-line', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  // Line 1 (red, l1): circle -> triangle. Line 2 (blue, l2): triangle -> square.
  const p1 = await canvasPoint(page, FIXED_STATIONS.circle.x, FIXED_STATIONS.circle.y);
  const p2 = await canvasPoint(page, FIXED_STATIONS.triangle.x, FIXED_STATIONS.triangle.y);
  const p3 = await canvasPoint(page, FIXED_STATIONS.square.x, FIXED_STATIONS.square.y);
  await touchDrag(page, p1, p2);
  await page.waitForTimeout(150);
  await touchDrag(page, p2, p3);
  await page.waitForTimeout(200);

  const swatch1 = await page.locator('[data-testid="hud-line-swatch-l1"]').boundingBox();
  const swatch2 = await page.locator('[data-testid="hud-line-swatch-l2"]').boundingBox();
  expect(swatch1).not.toBeNull();
  expect(swatch2).not.toBeNull();
  const touch1 = { x: swatch1!.x + swatch1!.width / 2, y: swatch1!.y + swatch1!.height / 2 };
  const touch2 = { x: swatch2!.x + swatch2!.width / 2, y: swatch2!.y + swatch2!.height / 2 };

  // Both fingers down together, then finger 1 lifts well under DELETE_HOLD_MS (600ms)
  // while finger 2 stays down past it.
  await touchStart(page, [touch1, touch2]);
  await page.waitForTimeout(200);
  await touchEndKeeping(page, [touch2]); // release touch1 only; touch2 still down
  await page.waitForTimeout(500); // touch2's total hold is now ~700ms, past the threshold
  await touchEndKeeping(page, []); // release touch2
  await page.waitForTimeout(200);

  const leg1 = { x: Math.round(FIXED_STATIONS.circle.x + 40), y: Math.round(FIXED_STATIONS.circle.y - 40) };
  const leg2 = { x: Math.round(FIXED_STATIONS.triangle.x + 40), y: Math.round(FIXED_STATIONS.triangle.y + 40) };
  const pixel1 = await getCanvasPixel(page, leg1.x, leg1.y);
  const pixel2 = await getCanvasPixel(page, leg2.x, leg2.y);

  // Line 1's touch was released early (200ms) -> should still exist, not background.
  expect([pixel1[0], pixel1[1], pixel1[2]]).not.toEqual([245, 240, 232]);
  // Line 2's touch was held past the threshold (~700ms) -> should be deleted, background.
  expect([pixel2[0], pixel2[1], pixel2[2]]).toEqual([245, 240, 232]);
});
