import { CONFIG } from '../config/gameConfig';
import type { GameState } from '../types/game';

// Decorative in-run backdrop (themes/metro.md §7.1): an abstract procedural city —
// road grid, buildings that pop in as the run progresses, cars drifting along roads.
// Purely visual: nothing in gameplay reads any of this. Everything is a pure function
// of (block/car index, game time, wall time), so there's no stored backdrop state and
// the city is identical every session at the same progress point. Building density
// runs on game time (freezes with the Game Clock); car motion and churn run on
// wall-clock `now` so the city stays alive while paused.

const W = CONFIG.WORLD_WIDTH;
const H = CONFIG.WORLD_HEIGHT;
const BLOCK = CONFIG.BG_BLOCK_SIZE;
const COLS = W / BLOCK;
const ROWS = H / BLOCK;

// Deterministic per-(ix,iy,salt) value in [0,1) — integer mix, no state.
function hash(ix: number, iy: number, salt: number): number {
  let h = (ix * 374761393 + iy * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function renderBackground(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const { camera, viewport, gameTimeMs } = state;
  const weeks = gameTimeMs / CONFIG.WEEK_DURATION_MS; // continuous, so growth trickles

  // Visible world rect, clamped to the map — everything below culls against it.
  const halfW = viewport.width / 2 / camera.zoom;
  const halfH = viewport.height / 2 / camera.zoom;
  const left = Math.max(0, camera.x - halfW);
  const right = Math.min(W, camera.x + halfW);
  const top = Math.max(0, camera.y - halfH);
  const bottom = Math.min(H, camera.y + halfH);

  // Roads: static block-edge lines covering exactly the map rectangle.
  ctx.strokeStyle = CONFIG.BG_ROAD_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = Math.ceil(left / BLOCK) * BLOCK; x <= right; x += BLOCK) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  for (let y = Math.ceil(top / BLOCK) * BLOCK; y <= bottom; y += BLOCK) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();

  // Buildings: one slot per block. A block's building "stands" once the density curve
  // reaches its fixed pseudorandom rank; the pop-in is game-time (density crossing),
  // the churn blink is wall-clock.
  const density = Math.min(CONFIG.BG_DENSITY_MAX, CONFIG.BG_DENSITY_BASE + CONFIG.BG_DENSITY_PER_WEEK * weeks);
  ctx.fillStyle = CONFIG.BG_BUILDING_COLOR;
  const cx0 = Math.max(0, Math.floor(left / BLOCK));
  const cx1 = Math.min(COLS - 1, Math.floor((right - 1) / BLOCK));
  const cy0 = Math.max(0, Math.floor(top / BLOCK));
  const cy1 = Math.min(ROWS - 1, Math.floor((bottom - 1) / BLOCK));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const rank = hash(cx, cy, 1);
      if (rank >= density) continue;
      const appearMs = Math.max(0, ((rank - CONFIG.BG_DENSITY_BASE) / CONFIG.BG_DENSITY_PER_WEEK) * CONFIG.WEEK_DURATION_MS);
      const popT = easeOutCubic(clamp01((gameTimeMs - appearMs) / CONFIG.BG_BUILDING_POP_MS));
      if (popT <= 0) continue;

      // Churn: blink out for BG_CHURN_OFF_MS once per cycle, own fixed phase, with
      // pop-length fades at both edges of the absence.
      const tOff = (now + hash(cx, cy, 2) * CONFIG.BG_CHURN_CYCLE_MS) % CONFIG.BG_CHURN_CYCLE_MS;
      let alpha = popT;
      if (tOff < CONFIG.BG_CHURN_OFF_MS) {
        const fadeOut = clamp01(tOff / CONFIG.BG_BUILDING_POP_MS);
        const fadeIn = clamp01((CONFIG.BG_CHURN_OFF_MS - tOff) / CONFIG.BG_BUILDING_POP_MS);
        alpha *= 1 - Math.min(fadeOut, fadeIn);
        if (alpha <= 0.01) continue;
      }

      const bw = 45 + hash(cx, cy, 3) * 45;
      const bh = 45 + hash(cx, cy, 4) * 45;
      const bx = cx * BLOCK + 12 + hash(cx, cy, 5) * (BLOCK - 24 - bw);
      const by = cy * BLOCK + 12 + hash(cx, cy, 6) * (BLOCK - 24 - bh);
      const s = 0.6 + 0.4 * popT; // grow in around the center
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.roundRect(bx + (bw * (1 - s)) / 2, by + (bh * (1 - s)) / 2, bw * s, bh * s, 3);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Cars: straight runs along roads in offset lanes, wrapping across the map. Count is
  // proportional to building density (traffic thickens in lockstep with the city);
  // each car's lane/direction/speed/phase is fixed by its index.
  const carCount = Math.round(CONFIG.BG_CARS_PER_DENSITY * density);
  ctx.fillStyle = CONFIG.BG_CAR_COLOR;
  for (let i = 0; i < carCount; i++) {
    const horizontal = hash(i, 0, 10) < 0.5;
    const laneCount = (horizontal ? ROWS : COLS) - 1;
    const lane = (1 + Math.floor(hash(i, 0, 11) * laneCount)) * BLOCK;
    const dir = hash(i, 0, 12) < 0.5 ? 1 : -1;
    const speed = CONFIG.BG_CAR_SPEED_PX_PER_SEC * (0.8 + 0.4 * hash(i, 0, 13));
    const span = horizontal ? W : H;
    const travel = hash(i, 0, 14) * span + dir * speed * (now / 1000);
    const pos = ((travel % span) + span) % span;
    const side = lane + dir * 4; // offset to the direction's own side of the road
    const x = horizontal ? pos : side;
    const y = horizontal ? side : pos;
    if (x < left - 10 || x > right + 10 || y < top - 10 || y > bottom + 10) continue;
    const len = CONFIG.BG_CAR_LENGTH;
    const wid = CONFIG.BG_CAR_WIDTH;
    ctx.beginPath();
    if (horizontal) ctx.roundRect(x - len / 2, y - wid / 2, len, wid, wid / 2);
    else ctx.roundRect(x - wid / 2, y - len / 2, wid, len, wid / 2);
    ctx.fill();
  }
}
