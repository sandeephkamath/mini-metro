import type { GameState } from '../types/game';
import { renderLines } from './renderLines';
import { renderStations } from './renderStations';
import { renderTrains } from './renderTrains';
import { renderDebug } from './renderDebug';

export function render(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const { width, height } = state.viewport;
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, width, height);

  const { camera } = state;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  renderLines(ctx, state);
  renderStations(ctx, state, now);
  renderTrains(ctx, state);

  ctx.restore();

  // Debug overlay is screen-space UI, drawn unscaled on top
  renderDebug(ctx, state);
}
