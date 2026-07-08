import { CONFIG } from '../config/gameConfig';
import { computeBentSegment } from '../logic/geometry';
import { traceShapePath } from './shapePaths';
import type { PictureCityData } from '../data/pictureCities';
import { getPictureForIndex } from '../logic/pictureContent';
import { buildWalkablePath, pointAt, stepWalker, type Walker, type WalkablePath } from '../logic/lineWalker';
import type { StationShape } from '../types/game';

// Purely cosmetic shape cycle for Picture waiting-passenger/rider dots (metro.md
// §9.3.2) — Pictures have no real destination-shape concept, so this is just
// visual variety, the same treatment the home screen ambient scene uses.
const SHAPE_CYCLE: StationShape[] = ['circle', 'triangle', 'square', 'star', 'hexagon', 'plus'];

// Random shapes for pre-seeding waiting passengers/riders (metro.md §9.3.2) —
// the scene starts already busy instead of building up from empty over the
// first several seconds.
function randomShapes(min: number, max: number): StationShape[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  return Array.from({ length: count }, () => SHAPE_CYCLE[Math.floor(Math.random() * SHAPE_CYCLE.length)]);
}

// A pale water band behind a Picture's lines/stations (metro.md §9.3) — the
// same decorative device as the home screen ambient scene's own water band,
// carried over so a Picture reads with the same "living city" richness rather
// than a flat single-color background. Generic (not per-city geography):
// drawn first, low-contrast, always fully covered by whatever draws on top.
function drawWaterBand(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const m = Math.min(width, height);
  ctx.save();
  ctx.strokeStyle = CONFIG.PICTURE_WATER_COLOR;
  ctx.lineWidth = m * 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(width * 0.88, -m * 0.1);
  ctx.lineTo(width * 0.62, height * 0.4);
  ctx.lineTo(width * 0.78, height * 1.1);
  ctx.stroke();
  ctx.restore();
}

// Renders a Picture's "full" (fully-revealed) image once, using the same
// bend-geometry and station-shape drawing primitives as live gameplay
// (themes/metro.md §9.3). Returns an offscreen canvas — cache the result per
// Picture index rather than re-rendering every frame.
export function renderPictureFull(city: PictureCityData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CONFIG.PICTURE_RENDER_WIDTH;
  canvas.height = CONFIG.PICTURE_RENDER_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = CONFIG.PICTURE_BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawWaterBand(ctx, canvas.width, canvas.height);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = CONFIG.PICTURE_LINE_WIDTH;

  for (const line of city.lines) {
    const positions = line.stationIndices.map(i => city.stations[i].pos);
    if (positions.length < 2) continue;

    ctx.strokeStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(positions[0].x, positions[0].y);
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      const seg = computeBentSegment(a, b, CONFIG.LINE_BEND_RADIUS);
      if (seg) {
        ctx.lineTo(seg.t1.x, seg.t1.y);
        ctx.quadraticCurveTo(seg.elbow.x, seg.elbow.y, seg.t2.x, seg.t2.y);
        ctx.lineTo(b.x, b.y);
      } else {
        ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();
  }

  // Stations render as a single consistent shape (a circle), not the gameplay
  // shape set — interchange stations get a larger double-ring (metro.md §9.3).
  for (const station of city.stations) {
    const r = station.interchange ? CONFIG.PICTURE_INTERCHANGE_RADIUS : CONFIG.PICTURE_STATION_RADIUS;
    traceShapePath(ctx, station.pos.x, station.pos.y, 'circle', r);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (station.interchange) {
      traceShapePath(ctx, station.pos.x, station.pos.y, 'circle', r - 3.5);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  return canvas;
}

// A Picture's full render is a deterministic, content-stable function of its
// index — cache it here rather than in each of the three UI spots that show one
// (Game-Over Reveal, Home Screen thumbnail, Collectibles Screen).
const pictureCanvasCache = new Map<number, HTMLCanvasElement>();
export function getPictureCanvas(index: number): HTMLCanvasElement {
  let canvas = pictureCanvasCache.get(index);
  if (!canvas) {
    canvas = renderPictureFull(getPictureForIndex(index));
    pictureCanvasCache.set(index, canvas);
  }
  return canvas;
}

// Composites a partially-revealed Picture into destCtx's (destX, destY, destW,
// destH) rect: the first `revealedTileCount` tiles (left-to-right, top-to-bottom,
// per the fixed reveal order in metro.md §9.3) show their portion of `fullCanvas`;
// the rest stay blank/dimmed.
export function drawRevealedPicture(
  destCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  fullCanvas: HTMLCanvasElement,
  revealedTileCount: number,
): void {
  const cols = CONFIG.PICTURE_TILE_COLS;
  const rows = CONFIG.PICTURE_TILE_ROWS;
  const tileW = destW / cols;
  const tileH = destH / rows;
  const srcTileW = fullCanvas.width / cols;
  const srcTileH = fullCanvas.height / rows;

  destCtx.save();
  destCtx.fillStyle = 'rgba(0,0,0,0.08)';
  destCtx.fillRect(destX, destY, destW, destH);

  const clamped = Math.max(0, Math.min(cols * rows, Math.floor(revealedTileCount)));
  for (let i = 0; i < clamped; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    destCtx.drawImage(
      fullCanvas,
      col * srcTileW, row * srcTileH, srcTileW, srcTileH,
      destX + col * tileW, destY + row * tileH, tileW, tileH,
    );
  }
  destCtx.restore();
}

// Animated Presentation (themes/metro.md §9.3.2) — a simulated train per
// PictureLineData, walking that line's real station order and picking up/
// dropping off decorative waiting-passenger dots exactly like the home screen
// ambient scene. Built once per Picture and then stepped every frame by the
// caller's animation loop.
export interface PictureTrain {
  path: WalkablePath;
  color: string;
  walker: Walker;
  stationIndices: number[]; // city.stations index at each of path's stops, parallel to path.stopDists
  riders: StationShape[];
}

export function buildPictureTrains(city: PictureCityData): PictureTrain[] {
  const trains: PictureTrain[] = [];
  city.lines.forEach((line, lineIndex) => {
    const positions = line.stationIndices.map(i => city.stations[i].pos);
    if (positions.length < 2) return;
    // Same bend radius renderPictureFull uses to draw this line's elbows, so a
    // walking train stays exactly on the visible track through every bend.
    const path = buildWalkablePath(positions, undefined, CONFIG.LINE_BEND_RADIUS);
    const count = lineIndex % 2 === 0 ? 2 : 1; // alternates, matching the home screen ambient scene
    for (let i = 0; i < count; i++) {
      trains.push({
        path,
        color: line.color,
        walker: {
          dist: (path.total * (i + 1)) / (count + 1),
          dir: i % 2 === 0 ? 1 : -1,
          dwellUntil: 0,
        },
        stationIndices: line.stationIndices,
        riders: randomShapes(1, CONFIG.PICTURE_TRAIN_SEATS),
      });
    }
  });
  return trains;
}

// Runtime waiting-passenger state for one real station, shared across every
// line/train that touches it (an interchange has one physical queue, not one
// per line). Built once per Picture alongside its trains.
export interface PictureStation {
  index: number; // city.stations index
  pos: { x: number; y: number };
  shape: StationShape; // cosmetic only, cycles for visual variety
  waiting: StationShape[];
  nextSpawnAt: number;
}

export function buildPictureStations(city: PictureCityData, now: number): PictureStation[] {
  return city.stations.map((s, i) => ({
    index: i,
    pos: s.pos,
    shape: SHAPE_CYCLE[i % SHAPE_CYCLE.length],
    waiting: randomShapes(1, CONFIG.PICTURE_MAX_WAITING),
    nextSpawnAt: now + CONFIG.PICTURE_PASSENGER_SPAWN_MIN_MS + Math.random() * CONFIG.PICTURE_PASSENGER_SPAWN_JITTER_MS,
  }));
}

// Reused scratch canvas for compositing a frame's live scene before it's
// tile-clipped into the destination — safe to share because each call fully
// draws and composites before returning (no interleaving across RAF callbacks).
let liveScratchCanvas: HTMLCanvasElement | null = null;
function getLiveScratchCanvas(width: number, height: number): HTMLCanvasElement {
  if (!liveScratchCanvas) liveScratchCanvas = document.createElement('canvas');
  if (liveScratchCanvas.width !== width) liveScratchCanvas.width = width;
  if (liveScratchCanvas.height !== height) liveScratchCanvas.height = height;
  return liveScratchCanvas;
}

// Steps each train and station and composites the animated Picture into
// destCtx's rect, masked by revealedTileCount exactly like drawRevealedPicture
// — the whole live scene is only visible within tiles already revealed
// (metro.md §9.3.2).
export function drawAnimatedPictureFrame(
  destCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  fullCanvas: HTMLCanvasElement,
  trains: PictureTrain[],
  stations: PictureStation[],
  now: number,
  dt: number,
  revealedTileCount: number,
): void {
  for (const s of stations) {
    if (s.waiting.length < CONFIG.PICTURE_MAX_WAITING && now >= s.nextSpawnAt) {
      s.waiting.push(SHAPE_CYCLE[Math.floor(Math.random() * SHAPE_CYCLE.length)]);
      s.nextSpawnAt = now + CONFIG.PICTURE_PASSENGER_SPAWN_MIN_MS + Math.random() * CONFIG.PICTURE_PASSENGER_SPAWN_JITTER_MS;
    }
  }

  for (const train of trains) {
    const stopDist = stepWalker(train.path, train.walker, now, dt, CONFIG.PICTURE_TRAIN_SPEED, CONFIG.PICTURE_TRAIN_DWELL_MS);
    if (stopDist === null) continue;
    const stopIndex = train.path.stopDists.indexOf(stopDist);
    const station = stations.find(s => s.index === train.stationIndices[stopIndex]);
    if (!station) continue;
    train.riders = train.riders.filter(() => Math.random() > 0.5);
    while (station.waiting.length > 0 && train.riders.length < CONFIG.PICTURE_TRAIN_SEATS) {
      train.riders.push(station.waiting.shift()!);
    }
    station.waiting = [];
  }

  const live = getLiveScratchCanvas(fullCanvas.width, fullCanvas.height);
  const liveCtx = live.getContext('2d')!;
  liveCtx.clearRect(0, 0, live.width, live.height);
  liveCtx.drawImage(fullCanvas, 0, 0);

  liveCtx.fillStyle = '#3a3a3a';
  for (const s of stations) {
    s.waiting.forEach((shape, wi) => {
      traceShapePath(liveCtx, s.pos.x + 10 + wi * 7, s.pos.y - 9, shape, 2.6);
      liveCtx.fill();
    });
  }

  for (const train of trains) {
    const p = pointAt(train.path, train.walker.dist);
    liveCtx.save();
    liveCtx.translate(p.x, p.y);
    liveCtx.rotate(p.angle);
    liveCtx.fillStyle = train.color;
    liveCtx.beginPath();
    liveCtx.roundRect(-7, -3.5, 14, 7, 2);
    liveCtx.fill();
    liveCtx.fillStyle = '#fff';
    train.riders.forEach((shape, ri) => {
      traceShapePath(liveCtx, -5 + ri * 3.2, 0, shape, 1.4);
      liveCtx.fill();
    });
    liveCtx.restore();
  }

  drawRevealedPicture(destCtx, destX, destY, destW, destH, live, revealedTileCount);
}
