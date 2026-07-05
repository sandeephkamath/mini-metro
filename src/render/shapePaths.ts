import type { StationShape } from '../types/game';

// Traces a path for the given shape centered at (x, y) with "radius" r (half-size),
// shared by station bodies, passenger dots, and in-train passenger icons so the
// six shapes are drawn consistently at every size.
export function traceShapePath(ctx: CanvasRenderingContext2D, x: number, y: number, shape: StationShape, r: number): void {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'triangle': {
      const h = r * 1.8;
      ctx.moveTo(x, y - h * 0.65);
      ctx.lineTo(x + h * 0.6, y + h * 0.35);
      ctx.lineTo(x - h * 0.6, y + h * 0.35);
      ctx.closePath();
      break;
    }
    case 'square':
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;
    case 'star': {
      const spikes = 5;
      const outerR = r * 1.15;
      const innerR = r * 0.5;
      let rot = -Math.PI / 2;
      const step = Math.PI / spikes;
      ctx.moveTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
      for (let i = 0; i < spikes; i++) {
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
      }
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      const hexR = r * 1.05;
      const start = -Math.PI / 2;
      ctx.moveTo(x + Math.cos(start) * hexR, y + Math.sin(start) * hexR);
      for (let i = 1; i <= 6; i++) {
        const angle = start + i * (Math.PI / 3);
        ctx.lineTo(x + Math.cos(angle) * hexR, y + Math.sin(angle) * hexR);
      }
      ctx.closePath();
      break;
    }
    case 'plus': {
      const arm = r * 0.5;
      const len = r * 1.1;
      ctx.moveTo(x - arm, y - len);
      ctx.lineTo(x + arm, y - len);
      ctx.lineTo(x + arm, y - arm);
      ctx.lineTo(x + len, y - arm);
      ctx.lineTo(x + len, y + arm);
      ctx.lineTo(x + arm, y + arm);
      ctx.lineTo(x + arm, y + len);
      ctx.lineTo(x - arm, y + len);
      ctx.lineTo(x - arm, y + arm);
      ctx.lineTo(x - len, y + arm);
      ctx.lineTo(x - len, y - arm);
      ctx.lineTo(x - arm, y - arm);
      ctx.closePath();
      break;
    }
  }
}
