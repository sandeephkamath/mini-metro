import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { computeTrainAngle } from '../logic/trains';
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
    ctx.translate(train.pos.x, train.pos.y);
    ctx.rotate(computeTrainAngle(train, line, state));

    // Spawn-in fade/scale — matches the Station spawn treatment (themes/metro.md §7
    // item 9). Game-time driven, so it freezes with the Game Clock.
    const spawnT = Math.max(0, Math.min(1, (state.gameTimeMs - train.spawnedAtMs) / CONFIG.TRAIN_SPAWN_ANIM_MS));
    if (spawnT < 1) {
      ctx.globalAlpha = 0.2 + 0.8 * spawnT;
      const s = 0.4 + 0.6 * spawnT;
      ctx.scale(s, s);
    }

    const w = CONFIG.TRAIN_WIDTH;
    const h = CONFIG.TRAIN_HEIGHT;
    const gap = CONFIG.CARRIAGE_GAP;

    // Per-carriage passenger capacity, front carriage first: base capacity, then
    // one CARRIAGE_CAPACITY_BONUS slice per attached Depot Carriage.
    const capacities: number[] = [CONFIG.TRAIN_INITIAL_CAPACITY];
    for (let i = 1; i < train.carriageCount; i++) capacities.push(CONFIG.CARRIAGE_CAPACITY_BONUS);

    let passengerCursor = 0;
    for (let c = 0; c < train.carriageCount; c++) {
      const cx = -c * (w + gap);

      if (c > 0) {
        // Link to the previous carriage
        ctx.strokeStyle = darken(line.color, 0.1);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + w / 2, 0);
        ctx.lineTo(cx + w / 2 + gap, 0);
        ctx.stroke();
      }

      ctx.fillStyle = darken(line.color);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.stroke();

      // Passenger icons inside this carriage — tiny destination shapes
      const capacity = capacities[c];
      const inCarriage = train.passengers.slice(passengerCursor, passengerCursor + capacity);
      passengerCursor += capacity;
      const maxIcons = Math.min(inCarriage.length, 6);
      for (let i = 0; i < maxIcons; i++) {
        const shape = inCarriage[i].destinationShape;
        const px = cx - w / 2 + 3 + i * ((w - 6) / maxIcons) + (w - 6) / (maxIcons * 2);
        // Light-on-dark for legibility against the dark train body (themes/metro.md §7 item 10)
        traceShapePath(ctx, px, 0, shape, 2);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
