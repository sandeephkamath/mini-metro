import type { CDPSession, Page } from '@playwright/test';

// Playwright's built-in page.touchscreen only supports a single tap (down+up with
// no move, no multi-touch) — real drag/pinch/pan gestures need raw CDP touch events,
// same technique used for manual verification during development. touchPoints use
// page-space pixel coordinates (already resolved through gameDriver's canvasPoint,
// not logical 800x600 canvas coordinates).
//
// CDP's touch simulation tracks in-flight-touch state per session, not globally —
// touchStart/Move/End for one gesture must all go through the *same* CDPSession or
// Chrome rejects the Move/End with "Must send a TouchStart first". Cache one session
// per Page rather than creating a new one on every dispatch call.

type TouchPt = { x: number; y: number };

const sessions = new WeakMap<Page, CDPSession>();

async function getSession(page: Page): Promise<CDPSession> {
  let client = sessions.get(page);
  if (!client) {
    client = await page.context().newCDPSession(page);
    sessions.set(page, client);
  }
  return client;
}

async function dispatch(page: Page, type: 'touchStart' | 'touchMove' | 'touchEnd', points: TouchPt[]) {
  const client = await getSession(page);
  await client.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ x: p.x, y: p.y })) });
}

export async function touchDrag(page: Page, from: TouchPt, to: TouchPt, steps = 4) {
  await dispatch(page, 'touchStart', [from]);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await dispatch(page, 'touchMove', [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }]);
    await page.waitForTimeout(30);
  }
  await dispatch(page, 'touchEnd', []);
}

// Both fingers move symmetrically toward/away from `center` — distance goes from
// startDist to endDist (endDist > startDist = pinch out = zoom in, matching the
// real-world convention verified in useMouseInput.ts).
export async function touchPinch(page: Page, center: TouchPt, startDist: number, endDist: number, steps = 4) {
  const a0 = { x: center.x - startDist, y: center.y };
  const b0 = { x: center.x + startDist, y: center.y };
  await dispatch(page, 'touchStart', [a0, b0]);
  for (let i = 1; i <= steps; i++) {
    const d = startDist + (endDist - startDist) * (i / steps);
    await dispatch(page, 'touchMove', [{ x: center.x - d, y: center.y }, { x: center.x + d, y: center.y }]);
    await page.waitForTimeout(30);
  }
  await dispatch(page, 'touchEnd', []);
}

// Both fingers move together by the same delta, distance held constant — pans
// without zooming.
export async function touchPan(page: Page, center: TouchPt, delta: TouchPt, halfSpread = 40, steps = 4) {
  const a0 = { x: center.x - halfSpread, y: center.y };
  const b0 = { x: center.x + halfSpread, y: center.y };
  await dispatch(page, 'touchStart', [a0, b0]);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const dx = delta.x * t, dy = delta.y * t;
    await dispatch(page, 'touchMove', [{ x: a0.x + dx, y: a0.y + dy }, { x: b0.x + dx, y: b0.y + dy }]);
    await page.waitForTimeout(30);
  }
  await dispatch(page, 'touchEnd', []);
}

// Long-press: touchstart, hold for holdMs, then touchend — for the HUD line-swatch
// hold-to-delete gesture (DELETE_HOLD_MS in HUD.tsx).
export async function touchHold(page: Page, point: TouchPt, holdMs: number) {
  await dispatch(page, 'touchStart', [point]);
  await page.waitForTimeout(holdMs);
  await dispatch(page, 'touchEnd', []);
}
