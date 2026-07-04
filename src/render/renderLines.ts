import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';

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
