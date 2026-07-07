import type { GameState, MetroLine, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { getLineEndpoints, getSegmentElbow, chooseSegmentElbow, getDrawingChain } from '../logic/lines';
import { computeBentSegment } from '../logic/geometry';

// Stroke the stations from index `from` to index `to` (inclusive) of a line as one path,
// using the same straight-legs-plus-rounded-corner shape trains travel along.
function strokeLineRun(
  ctx: CanvasRenderingContext2D,
  line: MetroLine,
  positions: Vec2[],
  from: number,
  to: number,
): void {
  if (to - from < 1) return;
  ctx.beginPath();
  ctx.moveTo(positions[from].x, positions[from].y);
  for (let i = from; i < to; i++) {
    const a = positions[i];
    const b = positions[i + 1];
    const seg = computeBentSegment(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(line, i));
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

    // While this line's end is being shortened, its detachment-marked tail renders
    // faded so the player sees what release will remove (core §4).
    const d = state.drawing;
    const last = positions.length - 1;
    if (d.isDrawing && d.lineId === line.id && d.detachCount > 0 && d.extendEnd !== null) {
      const solidFrom = d.extendEnd === 'front' ? d.detachCount : 0;
      const solidTo = d.extendEnd === 'front' ? last : last - d.detachCount;
      strokeLineRun(ctx, line, positions, solidFrom, solidTo);
      ctx.globalAlpha = 0.25;
      if (d.extendEnd === 'front') {
        strokeLineRun(ctx, line, positions, 0, d.detachCount);
      } else {
        strokeLineRun(ctx, line, positions, last - d.detachCount, last);
      }
      ctx.globalAlpha = 1;
    } else {
      strokeLineRun(ctx, line, positions, 0, last);
    }
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

  // Drag preview (core §4): the provisional chain renders in the line's real color and
  // bend geometry — the player sees exactly how the route will form before releasing.
  // Only the dangling leg from the last chained station to the cursor stays dashed.
  if (state.drawing.isDrawing) {
    const d = state.drawing;
    const previewColor = d.lineId ? (state.lines[d.lineId]?.color ?? '#aaa') : '#aaa';
    ctx.strokeStyle = previewColor;

    if (d.insertAfterIndex !== null) {
      // Mid-line insertion: dashed leg from the grabbed segment point to the cursor.
      if (d.grabPos) {
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(d.grabPos.x, d.grabPos.y);
        ctx.lineTo(d.mousePos.x, d.mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      const chainIds = getDrawingChain(state).filter(id => state.stations[id]);
      const chain = chainIds.map(id => state.stations[id].pos);

      if (chain.length >= 2) {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(chain[0].x, chain[0].y);
        for (let i = 0; i < chain.length - 1; i++) {
          // Same elbow choice the commit will make, so the preview is the real geometry.
          const elbow = d.lineId ? chooseSegmentElbow(state, d.lineId, chainIds[i], chainIds[i + 1]) : undefined;
          const seg = computeBentSegment(chain[i], chain[i + 1], CONFIG.LINE_BEND_RADIUS, elbow);
          if (seg) {
            ctx.lineTo(seg.t1.x, seg.t1.y);
            ctx.quadraticCurveTo(seg.elbow.x, seg.elbow.y, seg.t2.x, seg.t2.y);
            ctx.lineTo(chain[i + 1].x, chain[i + 1].y);
          } else {
            ctx.lineTo(chain[i + 1].x, chain[i + 1].y);
          }
        }
        ctx.stroke();
      }

      const origin = chain[chain.length - 1];
      if (origin) {
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(d.mousePos.x, d.mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
