import type { GameState, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { getLineEndpoints, getSegmentElbow } from '../logic/lines';
import { computeBentSegment } from '../logic/geometry';

export function renderLines(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = CONFIG.LINE_WIDTH;

  for (const line of Object.values(state.lines)) {
    if (line.stationIds.length < 2) continue;

    const positions = line.stationIds
      .map(id => state.stations[id]?.pos)
      .filter((p): p is Vec2 => !!p);
    if (positions.length < 2) continue;

    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(positions[0].x, positions[0].y);
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      const seg = computeBentSegment(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, i));
      if (seg) {
        // Straight leg into the bend, a short rounded curve at the corner, straight leg
        // out — the segment as a whole stays straight, only the corner itself is smoothed.
        ctx.lineTo(seg.t1.x, seg.t1.y);
        ctx.quadraticCurveTo(seg.elbow.x, seg.elbow.y, seg.t2.x, seg.t2.y);
        ctx.lineTo(b.x, b.y);
      } else {
        ctx.lineTo(b.x, b.y);
      }
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
