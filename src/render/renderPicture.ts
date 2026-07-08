import { CONFIG } from '../config/gameConfig';
import { computeBentSegment } from '../logic/geometry';
import { traceShapePath } from './shapePaths';
import type { PictureCityData } from '../data/pictureCities';
import { getPictureForIndex } from '../logic/pictureContent';

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
