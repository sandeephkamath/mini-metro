import type { GameState, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { sampleTrailingPose } from '../logic/trains';
import { traceShapePath } from './shapePaths';

function darken(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r*(1-amount))},${Math.round(g*(1-amount))},${Math.round(b*(1-amount))})`;
}

export function renderTrains(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const train of Object.values(state.trains)) {
    const line = state.lines[train.lineId];
    if (!line || line.stationIds.length < 2) continue;

    ctx.save();

    // Spawn-in fade/scale — matches the Station spawn treatment (themes/metro.md §7
    // item 10). Game-time driven, so it freezes with the Game Clock.
    const spawnT = Math.max(0, Math.min(1, (state.gameTimeMs - train.spawnedAtMs) / CONFIG.TRAIN_SPAWN_ANIM_MS));
    const spawnAlpha = spawnT < 1 ? 0.2 + 0.8 * spawnT : 1;
    const spawnScale = spawnT < 1 ? 0.4 + 0.6 * spawnT : 1;

    const w = CONFIG.TRAIN_WIDTH;
    const h = CONFIG.TRAIN_HEIGHT;
    const gap = CONFIG.CARRIAGE_GAP;

    // Per-carriage passenger capacity, front carriage first: base capacity, then
    // one CARRIAGE_CAPACITY_BONUS slice per attached Depot Carriage.
    const capacities: number[] = [CONFIG.TRAIN_INITIAL_CAPACITY];
    for (let i = 1; i < train.carriageCount; i++) capacities.push(CONFIG.CARRIAGE_CAPACITY_BONUS);

    // World-space pose (position + facing angle) of each carriage, trailing the lead unit
    // along the actual track path — bending through curves/elbows/station corners instead
    // of rigidly extending in a straight line off the lead's current heading.
    const poses: { pos: Vec2; angle: number }[] = [];
    for (let c = 0; c < train.carriageCount; c++) {
      const { pos, tangent } = sampleTrailingPose(train, line, state, c * (w + gap));
      poses.push({ pos, angle: Math.atan2(tangent.y, tangent.x) });
    }

    let passengerCursor = 0;
    for (let c = 0; c < train.carriageCount; c++) {
      // Attach-in fade/scale, scoped to just this carriage (themes/metro.md §7 item 10)
      // — index 0 is the base train, already covered by the whole-train spawn fade above.
      const attachT = c === 0 ? 1 : Math.max(0, Math.min(1,
        (state.gameTimeMs - train.carriageAttachedAtMs[c]) / CONFIG.CARRIAGE_ATTACH_ANIM_MS));

      if (c > 0) {
        // Link to the previous carriage, drawn in world space between the two carriages'
        // own box edges so it stays taut through a bend even when they sit at different angles.
        const prev = poses[c - 1];
        const cur = poses[c];
        const prevBack: Vec2 = { x: prev.pos.x - Math.cos(prev.angle) * (w / 2), y: prev.pos.y - Math.sin(prev.angle) * (w / 2) };
        const curFront: Vec2 = { x: cur.pos.x + Math.cos(cur.angle) * (w / 2), y: cur.pos.y + Math.sin(cur.angle) * (w / 2) };
        ctx.save();
        ctx.globalAlpha = attachT;
        ctx.strokeStyle = darken(line.color, 0.1);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(prevBack.x, prevBack.y);
        ctx.lineTo(curFront.x, curFront.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(poses[c].pos.x, poses[c].pos.y);
      ctx.rotate(poses[c].angle);
      ctx.globalAlpha = attachT < 1 ? 0.2 + 0.8 * attachT : spawnAlpha;
      const s = attachT < 1 ? 0.4 + 0.6 * attachT : spawnScale;
      if (s !== 1) ctx.scale(s, s);

      ctx.fillStyle = darken(line.color);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.stroke();

      // Passenger icons inside this carriage — tiny destination shapes, in this
      // carriage's own local space (translated above)
      const capacity = capacities[c];
      const inCarriage = train.passengers.slice(passengerCursor, passengerCursor + capacity);
      passengerCursor += capacity;
      const maxIcons = Math.min(inCarriage.length, 6);
      for (let i = 0; i < maxIcons; i++) {
        const shape = inCarriage[i].destinationShape;
        const px = -w / 2 + 3 + i * ((w - 6) / maxIcons) + (w - 6) / (maxIcons * 2);
        // Light-on-dark for legibility against the dark train body (themes/metro.md §7 item 11)
        traceShapePath(ctx, px, 0, shape, 2);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
