import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { traceShapePath } from './shapePaths';

// Ghost flourishes for passenger board/deliver events (themes/metro.md §7 item 8):
// board — the icon shrinks and fades at the queue area, drifting toward the station;
// deliver — the icon grows and fades, drifting upward from the station center.
// Driven by game time, so they freeze with the Game Clock.
export function renderPassengerFx(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.passengerFx.length === 0) return;

  ctx.save();
  for (const fx of state.passengerFx) {
    const t = (state.gameTimeMs - fx.atMs) / CONFIG.PASSENGER_FX_MS;
    if (t < 0 || t >= 1) continue;
    const station = state.stations[fx.stationId];
    if (!station) continue;

    if (fx.kind === 'deliver') {
      const radius = 4 + 4 * t;
      const y = station.pos.y - CONFIG.STATION_RADIUS - 6 - t * 14;
      ctx.globalAlpha = 0.8 * (1 - t);
      traceShapePath(ctx, station.pos.x, y, fx.shape, radius);
      ctx.fillStyle = '#111';
      ctx.fill();
    } else {
      const queueY = station.pos.y + CONFIG.STATION_RADIUS + 10;
      const radius = 4 * (1 - 0.6 * t);
      const y = queueY - t * 10;
      ctx.globalAlpha = 0.7 * (1 - t);
      traceShapePath(ctx, station.pos.x, y, fx.shape, radius);
      ctx.fillStyle = '#111';
      ctx.fill();
    }
  }
  ctx.restore();
}
