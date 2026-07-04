import type { GameState, Station } from '../types/game';
import { CONFIG } from '../config/gameConfig';

function drawShape(ctx: CanvasRenderingContext2D, station: Station): void {
  const { x, y } = station.pos;
  const r = CONFIG.STATION_RADIUS;

  ctx.beginPath();
  if (station.shape === 'circle') {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (station.shape === 'triangle') {
    const h = r * 1.8;
    ctx.moveTo(x, y - h * 0.65);
    ctx.lineTo(x + h * 0.6, y + h * 0.35);
    ctx.lineTo(x - h * 0.6, y + h * 0.35);
    ctx.closePath();
  } else {
    const s = r * 1.3;
    ctx.rect(x - s, y - s, s * 2, s * 2);
  }
}

function getBorderColor(station: Station, state: GameState): string {
  for (const lineId of station.lineIds) {
    const line = state.lines[lineId];
    if (line) return line.color;
  }
  return '#999999';
}

export function renderStations(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  for (const station of Object.values(state.stations)) {
    ctx.save();

    const isNearFull = station.passengerQueue.length >= station.maxCapacity;
    const isOverfull = station.passengerQueue.length > station.maxCapacity;
    const flashOn = Math.floor(now / CONFIG.OVERFLOW_FLASH_INTERVAL_MS) % 2 === 0;

    // Warning / overflow glow
    if (isNearFull) {
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = isOverfull ? 28 : 14;
    }

    drawShape(ctx, station);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = (isNearFull && flashOn) ? '#e74c3c' : getBorderColor(station, state);
    ctx.lineWidth = isNearFull ? 4 : 3;
    ctx.stroke();

    ctx.restore();

    // Station label (e.g. C1, T2, S3)
    ctx.save();
    ctx.fillStyle = '#555';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(station.label, station.pos.x, station.pos.y - CONFIG.STATION_RADIUS - 4);
    ctx.restore();

    // Passenger dots (no save needed — uses absolute coords only)
    renderPassengerDots(ctx, station);
  }
}

function drawPassengerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, shape: string): void {
  const s = 4; // icon half-size
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x, y, s, 0, Math.PI * 2);
  } else if (shape === 'triangle') {
    ctx.moveTo(x, y - s * 1.1);
    ctx.lineTo(x + s, y + s * 0.7);
    ctx.lineTo(x - s, y + s * 0.7);
    ctx.closePath();
  } else {
    ctx.rect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 1.8);
  }
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
