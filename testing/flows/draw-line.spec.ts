import { test, expect } from '@playwright/test';
import { FIXED_STATIONS, drawLine, getCanvasPixel, startGame } from '../helpers/gameDriver';

test('dragging between two stations draws a line and spawns a train', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await drawLine(page, FIXED_STATIONS.circle, FIXED_STATIONS.triangle);
  await page.waitForTimeout(200); // let the next render frame paint the new line

  // Sample the midpoint of the segment for the first line color (#e74c3c red).
  const mid = {
    x: Math.round((FIXED_STATIONS.circle.x + FIXED_STATIONS.triangle.x) / 2),
    y: Math.round((FIXED_STATIONS.circle.y + FIXED_STATIONS.triangle.y) / 2),
  };
  const [r, g, b] = await getCanvasPixel(page, mid.x, mid.y);
  expect([r, g, b]).toEqual([231, 76, 60]);

  // A train should appear somewhere along the line within one stop cycle.
  // Train presence/position isn't reliably pixel-sampleable (it moves continuously),
  // so attach a screenshot for the agent to confirm visually.
  await page.waitForTimeout(1500);
  await test.info().attach('after-train-spawn', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
