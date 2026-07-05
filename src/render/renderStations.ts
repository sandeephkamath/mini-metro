import type { GameState, Station } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { traceShapePath } from './shapePaths';

function drawShape(ctx: CanvasRenderingContext2D, station: Station, radius: number): void {
  traceShapePath(ctx, station.pos.x, station.pos.y, station.shape, radius);
}

const STATION_BORDER_COLOR = '#333333';

// Newly-created Stations fade/scale in over STATION_SPAWN_ANIM_MS instead of
// popping in instantly — keyed to game time (not wall time) so it freezes with
// the rest of the Game Clock while paused (core/logic.md §6).
function renderSpawnHalo(ctx: CanvasRenderingContext2D, station: Station, spawnT: number): void {
  const haloRadius = CONFIG.STATION_RADIUS + (1 - spawnT) * 26;
  ctx.save();
  ctx.beginPath();
  ctx.arc(station.pos.x, station.pos.y, haloRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(120,120,120,${0.35 * (1 - spawnT)})`;
  ctx.fill();
  ctx.restore();
}

export function renderStations(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  for (const station of Object.values(state.stations)) {
    const age = state.gameTimeMs - station.spawnedAtMs;
    const spawning = age < CONFIG.STATION_SPAWN_ANIM_MS;
    const spawnT = spawning ? Math.max(0, Math.min(1, age / CONFIG.STATION_SPAWN_ANIM_MS)) : 1;
    const radius = CONFIG.STATION_RADIUS * (0.3 + 0.7 * spawnT);

    if (spawning) renderSpawnHalo(ctx, station, spawnT);

    ctx.save();

    const atRisk = station.riskTimer !== null;
    const approaching = !atRisk && station.passengerQueue.length >= station.maxCapacity - 1;
    const flashOn = Math.floor(now / CONFIG.OVERFLOW_FLASH_INTERVAL_MS) % 2 === 0;

    // Warning / at-risk glow
    if (atRisk || approaching) {
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = atRisk ? 28 : 14;
    }

    ctx.globalAlpha = spawnT;
    drawShape(ctx, station, radius);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = ((atRisk || approaching) && flashOn) ? '#e74c3c' : STATION_BORDER_COLOR;
    ctx.lineWidth = (atRisk || approaching) ? 4 : 3;
    ctx.stroke();

    ctx.restore();

    // Risk Timer countdown arc — shrinks clockwise from a full ring as the
    // Grace Timer (core/logic.md §3 Node Overflow) counts down to zero.
    if (atRisk) {
      const frac = Math.max(0, Math.min(1, station.riskTimer! / state.graceDurationMs));
      ctx.save();
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      ctx.arc(station.pos.x, station.pos.y, CONFIG.STATION_RADIUS + 8, startAngle, startAngle + frac * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Station label (e.g. C1, T2, S3) — debug mode only
    if (state.debugMode) {
      ctx.save();
      ctx.fillStyle = '#555';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(station.label, station.pos.x, station.pos.y - CONFIG.STATION_RADIUS - 4);
      ctx.restore();
    }

    // Passenger dots (no save needed — uses absolute coords only)
    renderPassengerDots(ctx, station);
  }
}

function drawPassengerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, shape: Station['shape']): void {
  traceShapePath(ctx, x, y, shape, 4);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function renderPassengerDots(ctx: CanvasRenderingContext2D, station: Station): void {
  const count = station.passengerQueue.length;
  if (count === 0) return;

  ctx.save();
  const maxVisible = Math.min(count, 8);
  const spacing = 11;
  const cols = 2;
  const startX = station.pos.x - spacing / 2 + spacing / 4;
  const startY = station.pos.y + CONFIG.STATION_RADIUS + 10;

  for (let i = 0; i < maxVisible; i++) {
    const p = station.passengerQueue[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawPassengerIcon(ctx, startX + col * spacing, startY + row * spacing, p.destinationShape);
  }

  if (count > 8) {
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`+${count - 8}`, station.pos.x, startY + Math.ceil(maxVisible / cols) * spacing + 2);
  }
  ctx.restore();
}
