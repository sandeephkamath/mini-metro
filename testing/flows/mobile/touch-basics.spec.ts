import { test, expect } from '@playwright/test';
import {
  FIXED_STATIONS, canvasPoint, getCanvasPixel, getCanvasPixelAtLocal, getLiveCameraViewportSnapshot,
  localPoint, projectWorldToLocal, startGame,
} from '../../helpers/gameDriver';
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

// iPhone 13's default viewport (390x844) is portrait — themes/metro.md §6.1 says the
// stage should rotate 90° to fill it, and (since the fix for the mobile letterboxing
// bug) the canvas is now sized to exactly match the real viewport instead of scaling a
// fixed 800x600 design down to fit inside it. Confirms there's zero letterboxing, not
// just that individual touch coordinates happen to still resolve correctly (covered
// separately below).
test('portrait viewport is filled edge-to-edge by the rotated stage (no letterboxing)', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const viewport = page.viewportSize()!;
  expect(viewport.height).toBeGreaterThan(viewport.width); // sanity-check this device profile is actually portrait

  const canvasBox = await page.locator('canvas').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeLessThan(canvasBox!.height); // rotated: bounding box is taller than wide

  expect(Math.abs(canvasBox!.width - viewport.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(canvasBox!.height - viewport.height)).toBeLessThanOrEqual(2);
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
  // Drag from a point with no station nearby (empty map space) to pan. World coordinates
  // (canvasPoint takes world, not screen-space, positions) — chosen to land within the
  // initial camera's on-screen view (center (1200,900), zoom 1) while staying clear of
  // all three starting stations (see FIXED_STATIONS).
  const start = await canvasPoint(page, 1500, 1100);
  const end = await canvasPoint(page, 1300, 950);
  await touchDrag(page, start, end, 8);
  await page.waitForTimeout(200);
  const after = await page.screenshot();

  expect(before.equals(after)).toBe(false);
  await test.info().attach('before-pan', { body: before, contentType: 'image/png' });
  await test.info().attach('after-pan', { body: after, contentType: 'image/png' });
});

// specs/testing.md §3.1 "Two-Finger Pan" — touchPan() already existed in touchDriver.ts
// but a QA pass found no committed test actually called it. Two fingers moving together
// (pinch distance constant) should translate the Camera by exactly the midpoint's
// canvas-local movement (mouseHandler.ts/camera.ts), with zoom unchanged — checked here
// by predicting exactly where a known Station ends up (not just "something changed").
test('two-finger pan (constant pinch distance) translates the camera without zooming', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  // This device's rotated canvas is shorter than the old fixed 600px design height, so
  // the initial station cluster doesn't quite fit at the default zoom — the Camera's
  // auto-fit (core/logic.md §5) kicks in and lerps toward a wider view right after game
  // start. Wait for it to settle before snapshotting the camera below: this test predicts
  // exactly where things end up relative to a single before-pan snapshot, which only
  // holds once the Camera has stopped drifting on its own.
  await page.waitForTimeout(2000);

  // Dead center of a Station's shape is its white fill (`#ffffff`), reliably distinct
  // from the canvas background fill (`#f5f0e8` = [245,240,232], renderer.ts) — used as
  // the "is a Station drawn here" signal instead of alpha (the background itself is
  // fully opaque, so alpha is 255 everywhere and can't distinguish the two).
  const BACKGROUND: [number, number, number] = [245, 240, 232];
  const square = FIXED_STATIONS.square;

  // Snapshot the camera once and reason entirely in that fixed local/screen frame from
  // here on — panning never moves a Station's WORLD position, so re-deriving local
  // coordinates from the world via the *live* (post-pan) camera would just keep tracking
  // the Station back to wherever it now renders, and could never detect that it moved.
  const before = await getLiveCameraViewportSnapshot(page);
  const squareLocal = projectWorldToLocal(square, before.camera, before.viewport);
  const beforePixel = await getCanvasPixelAtLocal(page, squareLocal.x, squareLocal.y);
  expect([beforePixel[0], beforePixel[1], beforePixel[2]]).not.toEqual(BACKGROUND); // sanity: Station is drawn here first

  // Pan by a known world-space delta, expressed in the snapshotted local frame (a world
  // delta of (dx,dy) is a local delta of (dx*zoom,dy*zoom) — camera.ts's screenToWorld is
  // a uniform scale, so this holds regardless of the Camera's current zoom).
  const dx = 100, dy = -60;
  const localDelta = { x: dx * before.camera.zoom, y: dy * before.camera.zoom };
  const centerPage = await localPoint(page, squareLocal, before.viewport);
  const shiftedLocal = { x: squareLocal.x + localDelta.x, y: squareLocal.y + localDelta.y };
  const shiftedPage = await localPoint(page, shiftedLocal, before.viewport);
  const pageDelta = { x: shiftedPage.x - centerPage.x, y: shiftedPage.y - centerPage.y };
  await touchPan(page, centerPage, pageDelta);
  await page.waitForTimeout(200);

  // Same dx/dy = new-minus-last convention as mouse-drag panning (mouseHandler.ts): the
  // world visually shifts by +dx/+dy world units on screen. The Station should now
  // render at its old (snapshotted) LOCAL position + localDelta, and its old local
  // position should have reverted to background.
  const afterAtOldPos = await getCanvasPixelAtLocal(page, squareLocal.x, squareLocal.y);
  const afterAtNewPos = await getCanvasPixelAtLocal(page, shiftedLocal.x, shiftedLocal.y);
  expect([afterAtNewPos[0], afterAtNewPos[1], afterAtNewPos[2]]).not.toEqual(BACKGROUND); // Station now at the predicted shifted position
  expect([afterAtOldPos[0], afterAtOldPos[1], afterAtOldPos[2]]).toEqual(BACKGROUND); // old position reverted to background
});
