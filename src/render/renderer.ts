import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { renderLines } from './renderLines';
import { renderStations } from './renderStations';
import { renderTrains } from './renderTrains';
import { renderDebug } from './renderDebug';

export function render(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Background
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  renderLines(ctx, state);
  renderStations(ctx, state, now);
  renderTrains(ctx, state);
  renderDebug(ctx, state);
}
