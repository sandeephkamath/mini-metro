import type { GameState } from '../types/game';
import { renderBackground } from './renderBackground';
import { renderLines } from './renderLines';
import { renderStations } from './renderStations';
import { renderPassengerFx } from './renderPassengers';
import { renderTrains } from './renderTrains';
import { renderTutorial } from './renderTutorial';
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

  renderBackground(ctx, state, now); // decorative procedural city (themes/metro.md §7.1)
  renderLines(ctx, state);
  renderStations(ctx, state, now);
  renderPassengerFx(ctx, state);
  renderTrains(ctx, state);
  renderTutorial(ctx, state, now); // world-space highlights/hints, above game layers, below debug (TUTORIAL.md §4)

  ctx.restore();

  // Debug overlay is screen-space UI, drawn unscaled on top
  renderDebug(ctx, state);
}
