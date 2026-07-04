import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { getLineEndpoints } from '../logic/lines';

export function renderLines(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = CONFIG.LINE_WIDTH;

  for (const line of Object.values(state.lines)) {
    if (line.stationIds.length < 2) continue;

    ctx.strokeStyle = line.color;
    ctx.beginPath();

    const first = state.stations[line.stationIds[0]];
    if (!first) continue;
    ctx.moveTo(first.pos.x, first.pos.y);

    for (let i = 1; i < line.stationIds.length; i++) {
      const s = state.stations[line.stationIds[i]];
      if (s) ctx.lineTo(s.pos.x, s.pos.y);
    }
    ctx.stroke();
  }

  // End tabs — the draggable stub at each line terminus. A station can have several
  // of these fanned around it (once per line ending there); grabbing one extends
  // that specific line, so they need to be visually distinguishable from each other.
  for (const endpoint of getLineEndpoints(state)) {
    const line = state.lines[endpoint.lineId];
    const station = state.stations[endpoint.stationId];
    if (!line || !station) continue;

    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(station.pos.x, station.pos.y);
    ctx.lineTo(endpoint.handlePos.x, endpoint.handlePos.y);
    ctx.stroke();

    const dx = endpoint.handlePos.x - station.pos.x;
    const dy = endpoint.handlePos.y - station.pos.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len; // perpendicular unit vector, for the tab's crossbar
    const py = dx / len;
    const capHalf = CONFIG.LINE_WIDTH * 1.2;

    ctx.beginPath();
    ctx.moveTo(endpoint.handlePos.x - px * capHalf, endpoint.handlePos.y - py * capHalf);
    ctx.lineTo(endpoint.handlePos.x + px * capHalf, endpoint.handlePos.y + py * capHalf);
    ctx.stroke();
  }

  // Drag preview
  if (state.drawing.isDrawing) {
    const previewColor = state.drawing.lineId
      ? (state.lines[state.drawing.lineId]?.color ?? '#aaa')
      : '#aaa';
    const origin = state.drawing.startStationId
      ? state.stations[state.drawing.startStationId]?.pos
      : state.drawing.grabPos;

    if (origin) {
      ctx.strokeStyle = previewColor;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(state.drawing.mousePos.x, state.drawing.mousePos.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}
