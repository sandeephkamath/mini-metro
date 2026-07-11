import type { Locator, Page } from '@playwright/test';
import { ALL_SHAPES as GAME_ALL_SHAPES } from '../../src/logic/shapes';

export type Shape = 'circle' | 'triangle' | 'square' | 'star' | 'hexagon' | 'plus';

const ALL_SHAPES: Shape[] = GAME_ALL_SHAPES;
const BUTTON_W = 30;
const BUTTON_H = 24;
const BUTTON_GAP = 4;

type Camera = { x: number; y: number; zoom: number };
type Viewport = { width: number; height: number };
type Point = { x: number; y: number };

// Fixed starting layout — mirrors src/logic/stations.ts initial placement. True WORLD
// coordinates (not screen-space): the game's on-screen viewport size is now dynamic
// (GameCanvas.tsx, themes/metro.md §6.1), so a fixed screen-space position is no longer
// meaningful, but the stations' world positions never change. Only the three starting
// shapes have fixed positions; star/hexagon/plus spawn dynamically later.
export const FIXED_STATIONS: Record<'circle' | 'triangle' | 'square', Point> = {
  circle: { x: 980, y: 880 },
  triangle: { x: 1200, y: 780 },
  square: { x: 1420, y: 920 },
};

function clampMenu(x: number, y: number, shapeCount: number, viewport: Viewport) {
  const totalW = shapeCount * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
  return {
    x: Math.min(x, viewport.width - totalW - 4),
    y: Math.max(4, Math.min(y, viewport.height - BUTTON_H - 4)),
  };
}

async function canvasLocator(page: Page): Promise<Locator> {
  return page.locator('canvas');
}

// Live camera/viewport, mirrored onto `window` by src/hooks/useGameLoop.ts purely for
// test observation (never read by game code). Needed because canvas-local pixel
// positions now depend on both the current camera framing and the (possibly dynamically
// sized, themes/metro.md §6.1) viewport, neither of which is a fixed constant anymore.
async function getLiveCameraViewport(page: Page): Promise<{ camera: Camera; viewport: Viewport }> {
  return page.evaluate(() => {
    const dbg = (window as unknown as { __miniMetroDebug: { camera: Camera; viewport: Viewport } }).__miniMetroDebug;
    return { camera: { x: dbg.camera.x, y: dbg.camera.y, zoom: dbg.camera.zoom }, viewport: { width: dbg.viewport.width, height: dbg.viewport.height } };
  });
}

// Mirrors src/render/renderer.ts's camera transform (translate(w/2,h/2) -> scale(zoom) ->
// translate(-camera.x,-camera.y)): maps a world point to canvas-local (pre-rotation) pixels.
function worldToLocal(world: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (world.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (world.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

// Maps canvas-local (pre-rotation) pixels to real on-screen coordinates, mirroring the
// inverse of useMouseInput.ts's getCanvasPos (screen -> local); this is local -> screen.
// The design's canvas is always wider-than-tall (landscape) unrotated, so a box that
// ends up narrower than tall can only mean the rotated presentation is active (GameCanvas.tsx
// `rotated`, themes/metro.md §6.1) — inferring it from the box's own aspect ratio here
// rather than needing to reach into React state.
function localToScreen(local: Point, viewport: Viewport, box: { x: number; y: number; width: number; height: number }): Point {
  const rotated = box.width < box.height;
  if (rotated) {
    return {
      x: box.x + (1 - local.y / viewport.height) * box.width,
      y: box.y + (local.x / viewport.width) * box.height,
    };
  }
  return {
    x: box.x + (local.x / viewport.width) * box.width,
    y: box.y + (local.y / viewport.height) * box.height,
  };
}

// Converts a WORLD coordinate (e.g. a station position) to a real on-screen point,
// accounting for the live camera framing, the current (possibly dynamic) viewport size,
// and any rotated presentation.
export async function canvasPoint(page: Page, worldX: number, worldY: number): Promise<Point> {
  const canvas = await canvasLocator(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const { camera, viewport } = await getLiveCameraViewport(page);
  const local = worldToLocal({ x: worldX, y: worldY }, camera, viewport);
  return localToScreen(local, viewport, box);
}

// Converts a canvas-LOCAL (screen-space, not world) coordinate to a real on-screen point —
// for UI that lives in screen space rather than the world, like the debug popup buttons
// (src/input/mouseHandler.ts's clampMenu operates on the same raw local click coordinates).
export async function localPoint(page: Page, local: Point, viewport: Viewport): Promise<Point> {
  const canvas = await canvasLocator(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  return localToScreen(local, viewport, box);
}

// Snapshots the live camera + viewport once. Exported for tests that need to reason
// about a FIXED local/screen position across a camera move (e.g. verifying a pan): re-
// reading the live camera after the move would just track the same world point back to
// wherever it renders now, which can't detect the move at all (see getCanvasPixelAtLocal).
export async function getLiveCameraViewportSnapshot(page: Page): Promise<{ camera: Camera; viewport: Viewport }> {
  return getLiveCameraViewport(page);
}

// Converts a world point to canvas-local pixels using an explicit (already-snapshotted)
// camera/viewport rather than a fresh live read — for predicting where a point *was* or
// *should be* relative to a snapshot taken before some camera movement.
export function projectWorldToLocal(world: Point, camera: Camera, viewport: Viewport): Point {
  return worldToLocal(world, camera, viewport);
}

// Reads the pixel at a fixed canvas-LOCAL (screen-space) coordinate — unlike
// getCanvasPixel, this does NOT re-derive position from the live camera, so it's the
// right choice for verifying camera motion itself (e.g. "the station used to render at
// this screen spot and now doesn't" — a world-coordinate read would trivially keep
// finding the station, since panning never moves it in world space).
export async function getCanvasPixelAtLocal(page: Page, localX: number, localY: number): Promise<[number, number, number, number]> {
  return page.evaluate(([px, py]) => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
    return [data[0], data[1], data[2], data[3]] as [number, number, number, number];
  }, [localX, localY]);
}

// True if a sampled pixel is part of the decorative backdrop rather than a gameplay
// element. The canvas is no longer a uniform `#f5f0e8` fill — themes/metro.md §7.1 draws
// a procedural city under gameplay: roads (`#ede7da`), buildings (`#ece4d5`, popping
// in/out over time), and moving cars (`#d9ceba`, the darkest backdrop tone — the reason
// for the 180 floor here). Every backdrop color is a light, desaturated paper tone,
// while gameplay ink is either saturated (line strokes), dark (trains, station
// borders), or pure white (station fill — deliberately excluded here, so don't use
// this to detect stations; compare against exact [255,255,255] instead). Never assert
// `toEqual([245,240,232])` for "nothing drawn here" — a road, building, or passing car
// under the sample point breaks it.
export function isBackdropPixel([r, g, b]: [number, number, number] | [number, number, number, number]): boolean {
  return Math.min(r, g, b) >= 180 && Math.max(r, g, b) - Math.min(r, g, b) <= 50 && !(r === 255 && g === 255 && b === 255);
}

export async function startGame(page: Page) {
  const playButton = page.getByRole('button', { name: 'Play' });
  const appeared = await playButton.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
  if (!appeared) return;
  await playButton.click();
  // Clicking Play before the background Remote Config fetch resolves (themes/metro.md
  // §5.1) shows a themed loading spinner in place of the Play control rather than
  // transitioning immediately — wait for that control to leave the DOM (the home
  // screen unmounts once the transition to 'playing' actually completes) instead of
  // assuming the click was synchronous.
  await playButton.waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
}

export async function restartGame(page: Page) {
  await page.getByRole('button', { name: 'Close' }).click();
  await startGame(page);
}

export async function getPhase(page: Page): Promise<'home' | 'playing' | 'gameover'> {
  if (await page.getByRole('button', { name: 'Play' }).isVisible().catch(() => false)) return 'home';
  if (await page.getByText('Game over').isVisible().catch(() => false)) return 'gameover';
  return 'playing';
}

export async function getScoreAndWeek(page: Page): Promise<{ score: number | null; week: number | null }> {
  return page.evaluate(() => {
    const weekEl = document.querySelector('[data-testid="hud-week"]');
    const scoreEl = document.querySelector('[data-testid="hud-score"]');
    return {
      week: weekEl ? parseInt((weekEl.textContent || '').replace('Week ', ''), 10) : null,
      score: scoreEl ? parseInt(scoreEl.textContent || '', 10) : null,
    };
  });
}

export async function drawLine(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const start = await canvasPoint(page, from.x, from.y);
  const end = await canvasPoint(page, to.x, to.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
}

export async function clickCanvas(page: Page, x: number, y: number) {
  const pt = await canvasPoint(page, x, y);
  await page.mouse.click(pt.x, pt.y);
}

export async function toggleDebugMode(page: Page) {
  await page.keyboard.press('d');
}

export async function setDebugSpeed(page: Page, speed: 0 | 1 | 2 | 3) {
  await page.keyboard.press(String(speed));
}

export async function toggleStationSpawn(page: Page) {
  await page.keyboard.press('s');
}

export async function togglePassengerSpawn(page: Page) {
  await page.keyboard.press('p');
}

// Requires debug mode already on, 'playing' phase (DEBUG.md § Debug Ad Availability).
// Forces the Ad Provider unavailable so Node Overflow ends the game unconditionally
// instead of offering the ad-gated Game-Over Continue (core/monetization.md §3) —
// use this in flows that test the plain overflow → gameover transition itself,
// not the Continue prompt.
export async function forceAdUnavailable(page: Page) {
  await page.keyboard.press('v');
}

// Requires the 'home' phase (page already navigated, before Play is clicked).
// DEBUG.md § Debug Auto-Tutorial Override — every flow in this suite calls this so the
// scripted auto-run Tutorial (specs/TUTORIAL.md §1) never intercepts the fresh board a
// test expects; a dedicated tutorial flow should simply not call it (the default,
// CONFIG.AUTO_TUTORIAL_ENABLED, is on). Toggling debug mode on to set this has no
// lasting effect — startGame() replaces the whole state (debugMode included) the
// moment Play is clicked, and only debugAutoTutorialForcedOff is read across that
// replacement (useGameState.ts).
export async function forceAutoTutorialOff(page: Page) {
  await page.keyboard.press('d'); // debug mode on
  await page.keyboard.press('u'); // arm the override
}

// Requires debug mode already on. Click the station, then the shape button in the popup.
// The popup itself is screen-space UI (mirrors src/input/mouseHandler.ts's clampMenu,
// which clamps against the raw local click coordinates, not world coordinates), so its
// button positions are computed in canvas-local space rather than world space.
export async function debugAddPassenger(
  page: Page,
  station: { x: number; y: number; shape: Shape },
  destination: Shape,
) {
  const shapes = ALL_SHAPES.filter(s => s !== station.shape);
  const index = shapes.indexOf(destination);
  if (index === -1) throw new Error(`destination ${destination} must differ from station shape ${station.shape}`);

  await clickCanvas(page, station.x, station.y);
  const { camera, viewport } = await getLiveCameraViewport(page);
  const clickLocal = worldToLocal(station, camera, viewport);
  const menu = clampMenu(clickLocal.x, clickLocal.y - 40, shapes.length, viewport);
  const bx = menu.x + index * (BUTTON_W + BUTTON_GAP) + BUTTON_W / 2;
  const by = menu.y + BUTTON_H / 2;
  const screenPt = await localPoint(page, { x: bx, y: by }, viewport);
  await page.mouse.click(screenPt.x, screenPt.y);
}

// Requires debug mode already on. Presses A, clicks empty canvas, then the shape button.
export async function debugAddStation(page: Page, pos: { x: number; y: number }, shape: Shape) {
  await page.keyboard.press('a');
  await clickCanvas(page, pos.x, pos.y);
  const { camera, viewport } = await getLiveCameraViewport(page);
  const clickLocal = worldToLocal(pos, camera, viewport);
  const menu = clampMenu(clickLocal.x, clickLocal.y, ALL_SHAPES.length, viewport);
  const index = ALL_SHAPES.indexOf(shape);
  const bx = menu.x + index * (BUTTON_W + BUTTON_GAP) + BUTTON_W / 2;
  const by = menu.y + BUTTON_H / 2;
  const screenPt = await localPoint(page, { x: bx, y: by }, viewport);
  await page.mouse.click(screenPt.x, screenPt.y);
}

export async function waitForScoreAtLeast(page: Page, target: number, timeoutMs: number): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { score } = await getScoreAndWeek(page);
    if (score !== null && score >= target) return score;
    await page.waitForTimeout(300);
  }
  const { score } = await getScoreAndWeek(page);
  return score ?? -1;
}

// Polls instead of a fixed waitForTimeout — how much real time a given amount of debug-
// sped-up game time actually takes isn't exact (RAF throttling, frame overhead), so a
// fixed wait tuned to the nominal multiplier can come up just short (see
// flows/weekly-upgrade.spec.ts). Polling is robust to that regardless of the actual ratio.
export async function waitForWeekAtLeast(page: Page, target: number, timeoutMs: number): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { week } = await getScoreAndWeek(page);
    if (week !== null && week >= target) return week;
    await page.waitForTimeout(500);
  }
  const { week } = await getScoreAndWeek(page);
  return week ?? -1;
}

// Reads the pixel at a WORLD coordinate. getImageData reads the canvas's raw pixel
// buffer directly — that's always exactly canvas-local (pre-rotation) space, unaffected
// by any CSS transform, so (unlike canvasPoint) there's no box/rotation step needed here,
// only the world -> local camera conversion.
export async function getCanvasPixel(page: Page, worldX: number, worldY: number): Promise<[number, number, number, number]> {
  const { camera, viewport } = await getLiveCameraViewport(page);
  const local = worldToLocal({ x: worldX, y: worldY }, camera, viewport);
  return page.evaluate(([px, py]) => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
    return [data[0], data[1], data[2], data[3]] as [number, number, number, number];
  }, [local.x, local.y]);
}
