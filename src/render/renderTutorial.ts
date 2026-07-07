import type { GameState, Station, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// Tutorial highlights + gesture hint (specs/TUTORIAL.md §4). Drawn in world space
// above the normal game layers, below the debug overlay. Driven by wall time (the
// RAF `now`), not game time — they must keep moving while the clock is held.

function highlightTargets(state: GameState): Station[] {
  const t = state.tutorial!;
  const ids =
    t.step === 'firstLine' ? [t.circleId, t.triangleId]
    : t.step === 'passenger' ? [t.circleId]
    : t.step === 'rescueAct' ? [t.squareId]
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
  if (t.step === 'rescueAct') {
    const square = state.stations[t.squareId];
    if (!square) return null;
    // Trace from the nearest station that's already on a line, so the hint shows
    // a rescue the player can actually perform.
    let nearest: Station | null = null;
    let nearestDist = Infinity;
    for (const s of Object.values(state.stations)) {
      if (s.id === square.id || s.lineIds.length === 0) continue;
      const d = Math.hypot(s.pos.x - square.pos.x, s.pos.y - square.pos.y);
      if (d < nearestDist) {
        nearest = s;
        nearestDist = d;
      }
    }
    return nearest ? { from: nearest.pos, to: square.pos } : null;
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
