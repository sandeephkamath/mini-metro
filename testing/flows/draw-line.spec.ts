import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, drawLine, getCanvasPixel, startGame } from '../helpers/gameDriver';

test('dragging between two stations draws a line and spawns a train', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await drawLine(page, FIXED_STATIONS.circle, FIXED_STATIONS.triangle);
  await page.waitForTimeout(200); // let the next render frame paint the new line

  // Lines render as mostly-straight legs with only a short rounded curve right at the bend
  // point (not a curve along the whole segment), so sample a spot on the straight leg — 40px
  // along the initial diagonal toward the bend, clear of the origin station's own circle
  // (radius 14) and well short of where the corner rounding (LINE_BEND_RADIUS, 28px back
  // from the bend) kicks in.
  const a = FIXED_STATIONS.circle;
  const b = FIXED_STATIONS.triangle;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const onLeg = {
    x: Math.round(a.x + Math.sign(dx) * 40),
    y: Math.round(a.y + Math.sign(dy) * 40),
  };
  const [r, g, b2] = await getCanvasPixel(page, onLeg.x, onLeg.y);
  expect([r, g, b2]).toEqual([231, 76, 60]);

  // A train should appear somewhere along the line within one stop cycle.
  // Train presence/position isn't reliably pixel-sampleable (it moves continuously),
  // so attach a screenshot for the agent to confirm visually.
  await page.waitForTimeout(1500);
  await test.info().attach('after-train-spawn', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
