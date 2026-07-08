// Shared "walk a polyline, dwell at stops, ping-pong at the ends" engine used
// by both the home screen's decorative ambient scene and the animated Picture
// presentation (themes/metro.md §9.3.2) — the same physics, driven by
// different line data.

import { buildSegmentShape, type SegmentShape } from './geometry';

export interface WalkablePath {
  pts: { x: number; y: number }[]; // raw station points, for callers that draw the line themselves
  segments: SegmentShape[]; // per-station-pair shape (straight or bent, matching what's drawn)
  cum: number[]; // cumulative length at the start of each segment; cum[segments.length] = total
  total: number;
  stopDists: number[]; // distances along the path where a walker should dwell
}

// bendRadius matches the corner rounding of whatever draws the line (0 = plain
// straight segments, e.g. the ambient scene's own synthetic routes). Passing
// the same radius a renderer used for its elbows (e.g. CONFIG.LINE_BEND_RADIUS
// for Pictures, metro.md §9.3.2) keeps a walking train exactly on the drawn
// track instead of cutting the corner a bent segment actually takes.
export function buildWalkablePath(
  pts: { x: number; y: number }[],
  stopIndices?: number[],
  bendRadius = 0,
): WalkablePath {
  const segments: SegmentShape[] = [];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const shape = buildSegmentShape(pts[i - 1], pts[i], bendRadius);
    segments.push(shape);
    cum.push(cum[i - 1] + shape.length);
  }
  const indices = stopIndices ?? pts.map((_, i) => i);
  return { pts, segments, cum, total: cum[cum.length - 1], stopDists: indices.map(i => cum[i]) };
}

export function pointAt(path: WalkablePath, dist: number): { x: number; y: number; angle: number } {
  if (path.segments.length === 0) return { x: path.pts[0].x, y: path.pts[0].y, angle: 0 };
  const d = Math.max(0, Math.min(path.total, dist));
  let i = 0;
  while (i < path.segments.length - 1 && path.cum[i + 1] < d) i++;
  const segLen = path.segments[i].length || 1;
  const t = (d - path.cum[i]) / segLen;
  const p = path.segments[i].pointAt(t);
  const tangent = path.segments[i].tangentAt(t);
  return { x: p.x, y: p.y, angle: Math.atan2(tangent.y, tangent.x) };
}

// Advances a walker by dt at speed, dwelling at any stop crossed and
// ping-ponging at the path's ends. Returns the stop distance it just began
// dwelling at (if any), so callers can react (e.g. board/alight riders).
export function stepWalker(
  path: WalkablePath,
  walker: Walker,
  now: number,
  dt: number,
  speed: number,
  dwellMs: number,
  endDwellMs = 500,
): number | null {
  if (now < walker.dwellUntil) return null;
  const prev = walker.dist;
  let next = prev + walker.dir * speed * (dt / 1000);

  let stopAt: number | null = null;
  for (const d of path.stopDists) {
    const crossed = walker.dir === 1 ? prev < d && d <= next : next <= d && d < prev;
    if (crossed && (stopAt === null || (walker.dir === 1 ? d < stopAt : d > stopAt))) {
      stopAt = d;
    }
  }
  if (stopAt !== null) {
    walker.dist = stopAt;
    walker.dwellUntil = now + dwellMs;
    return stopAt;
  }
  if (next >= path.total) {
    next = path.total;
    walker.dir = -1;
    walker.dwellUntil = now + endDwellMs;
  } else if (next <= 0) {
    next = 0;
    walker.dir = 1;
    walker.dwellUntil = now + endDwellMs;
  }
  walker.dist = next;
  return null;
}
