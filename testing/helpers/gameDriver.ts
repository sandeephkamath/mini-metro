import type { Locator, Page } from '@playwright/test';
import { ALL_SHAPES as GAME_ALL_SHAPES } from '../../src/logic/shapes';

export type Shape = 'circle' | 'triangle' | 'square' | 'star' | 'hexagon' | 'plus';

const ALL_SHAPES: Shape[] = GAME_ALL_SHAPES;
const BUTTON_W = 30;
const BUTTON_H = 24;
const BUTTON_GAP = 4;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Fixed starting layout — mirrors src/logic/stations.ts initial placement.
// Only the three starting shapes have fixed positions; star/hexagon/plus spawn dynamically later.
export const FIXED_STATIONS: Record<'circle' | 'triangle' | 'square', { x: number; y: number }> = {
  circle: { x: 180, y: 280 },
  triangle: { x: 400, y: 180 },
  square: { x: 620, y: 320 },
};

function clampMenu(x: number, y: number, shapeCount: number) {
  const totalW = shapeCount * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
  return {
    x: Math.min(x, CANVAS_WIDTH - totalW - 4),
    y: Math.max(4, Math.min(y, CANVAS_HEIGHT - BUTTON_H - 4)),
  };
}

async function canvasLocator(page: Page): Promise<Locator> {
  return page.locator('canvas');
}

async function canvasPoint(page: Page, x: number, y: number) {
  const canvas = await canvasLocator(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  return { x: box.x + x, y: box.y + y };
}

export async function startGame(page: Page) {
  if (await page.getByText('Play').isVisible().catch(() => false)) {
    await page.getByText('Play', { exact: true }).click();
  }
  await page.getByText('Start Game').click();
}

export async function restartGame(page: Page) {
  await page.getByText('Back to Home').click();
  await startGame(page);
}

export async function getPhase(page: Page): Promise<'home' | 'start' | 'playing' | 'gameover'> {
  if (await page.getByText('Play', { exact: true }).isVisible().catch(() => false)) return 'home';
  if (await page.getByText('Start Game').isVisible().catch(() => false)) return 'start';
  if (await page.getByText('Back to Home').isVisible().catch(() => false)) return 'gameover';
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

// Requires debug mode already on. Click the station, then the shape button in the popup.
export async function debugAddPassenger(
  page: Page,
  station: { x: number; y: number; shape: Shape },
  destination: Shape,
) {
  const shapes = ALL_SHAPES.filter(s => s !== station.shape);
  const index = shapes.indexOf(destination);
  if (index === -1) throw new Error(`destination ${destination} must differ from station shape ${station.shape}`);

  await clickCanvas(page, station.x, station.y);
  const menu = clampMenu(station.x, station.y - 40, shapes.length);
  const bx = menu.x + index * (BUTTON_W + BUTTON_GAP) + BUTTON_W / 2;
  const by = menu.y + BUTTON_H / 2;
  await clickCanvas(page, bx, by);
}

// Requires debug mode already on. Presses A, clicks empty canvas, then the shape button.
export async function debugAddStation(page: Page, pos: { x: number; y: number }, shape: Shape) {
  await page.keyboard.press('a');
  await clickCanvas(page, pos.x, pos.y);
  const menu = clampMenu(pos.x, pos.y, ALL_SHAPES.length);
  const index = ALL_SHAPES.indexOf(shape);
  const bx = menu.x + index * (BUTTON_W + BUTTON_GAP) + BUTTON_W / 2;
  const by = menu.y + BUTTON_H / 2;
  await clickCanvas(page, bx, by);
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

export async function getCanvasPixel(page: Page, x: number, y: number): Promise<[number, number, number, number]> {
  return page.evaluate(([px, py]) => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(px, py, 1, 1).data;
    return [data[0], data[1], data[2], data[3]] as [number, number, number, number];
  }, [x, y]);
}
