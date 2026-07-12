import type { GameState, Station, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { getLineEndpoints } from '../logic/lines';

// Tutorial highlights + gesture hint (specs/TUTORIAL.md §4). Drawn in world space
// above the normal game layers, below the debug overlay. Driven by wall time (the
// RAF `now`), not game time — they must keep moving while the clock is held.

function highlightTargets(state: GameState): Station[] {
  const t = state.tutorial!;
  const ids =
    t.step === 'firstLine' ? [t.circleId, t.triangleId]
    : t.step === 'extendLine' ? [t.triangleId, ...(t.extraStationId ? [t.extraStationId] : [])]
    : t.step === 'newLine' ? [t.squareId, t.triangleId]
    : t.step === 'rescueAct' ? (t.overflowStationId ? [t.overflowStationId] : [])
    : [];
  return ids.map(id => state.stations[id]).filter((s): s is Station => !!s);
}

// The drag path the gesture hint should trace, if this step teaches a drag.
function hintPath(state: GameState): { from: Vec2; to: Vec2 } | null {
  const t = state.tutorial!;
  if (t.step === 'firstLine') {
    const from = state.stations[t.circleId];
    const to = state.stations[t.triangleId];
    return from && to ? { from: from.pos, to: to.pos } : null;
  }
  if (t.step === 'extendLine') {
    const to = t.extraStationId ? state.stations[t.extraStationId] : null;
    if (!to) return null;
    // Point at the Line's actual end-tab handle, not the Station center — this
    // is genuinely the spot to grab to extend rather than start a new Line
    // (TUTORIAL.md §5 step 3 detail), so the hint should show exactly that.
    const endpoint = getLineEndpoints(state).find(ep => ep.stationId === t.triangleId);
    const from = endpoint ? endpoint.handlePos : state.stations[t.triangleId]?.pos;
    return from ? { from, to: to.pos } : null;
  }
  if (t.step === 'newLine') {
    const from = state.stations[t.squareId];
    const to = state.stations[t.triangleId];
    return from && to ? { from: from.pos, to: to.pos } : null;
  }
  if (t.step === 'rescueAct') {
    const overflow = t.overflowStationId ? state.stations[t.overflowStationId] : null;
    if (!overflow) return null;
    // Trace from the nearest station that's already on a line, so the hint shows
    // a rescue the player can actually perform.
    let nearest: Station | null = null;
    let nearestDist = Infinity;
    for (const s of Object.values(state.stations)) {
      if (s.id === overflow.id || s.lineIds.length === 0) continue;
      const d = Math.hypot(s.pos.x - overflow.pos.x, s.pos.y - overflow.pos.y);
      if (d < nearestDist) {
        nearest = s;
        nearestDist = d;
      }
    }
    return nearest ? { from: nearest.pos, to: overflow.pos } : null;
  }
  return null;
}

export function renderTutorial(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  if (!state.tutorial) return;

  const pulse = (Math.sin((now / CONFIG.TUTORIAL_PULSE_MS) * Math.PI * 2) + 1) / 2; // 0..1

  for (const station of highlightTargets(state)) {
    const r = CONFIG.STATION_RADIUS + 10 + pulse * 5;
    ctx.beginPath();
    ctx.arc(station.pos.x, station.pos.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230, 126, 34, ${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // Gesture hint: faint dashed path plus a dot travelling from→to on a loop.
  // Hidden the moment the player starts their own drag.
  const path = state.drawing.isDrawing ? null : hintPath(state);
  if (path) {
    ctx.beginPath();
    ctx.moveTo(path.from.x, path.from.y);
    ctx.lineTo(path.to.x, path.to.y);
    ctx.strokeStyle = 'rgba(44, 62, 80, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    const prog = (now % CONFIG.TUTORIAL_HINT_LOOP_MS) / CONFIG.TUTORIAL_HINT_LOOP_MS;
    const x = path.from.x + (path.to.x - path.from.x) * prog;
    const y = path.from.y + (path.to.y - path.from.y) * prog;
    // Fade in/out at the loop's ends so the dot doesn't visibly teleport back.
    const alpha = Math.min(1, Math.min(prog, 1 - prog) * 8);
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(44, 62, 80, ${0.7 * alpha})`;
    ctx.fill();
  }
}
