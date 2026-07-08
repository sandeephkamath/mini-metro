// Shared "walk a polyline, dwell at stops, ping-pong at the ends" engine used
// by both the home screen's decorative ambient scene and the animated Picture
// presentation (themes/metro.md §9.3.2) — the same physics, driven by
// different line data.

export interface WalkablePath {
  pts: { x: number; y: number }[];
  cum: number[]; // cumulative distance at each point
  total: number;
  stopDists: number[]; // distances along the path where a walker should dwell
}

export interface Walker {
  dist: number;
  dir: 1 | -1;
  dwellUntil: number;
}

export function buildWalkablePath(pts: { x: number; y: number }[], stopIndices?: number[]): WalkablePath {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const indices = stopIndices ?? pts.map((_, i) => i);
  return { pts, cum, total: cum[cum.length - 1], stopDists: indices.map(i => cum[i]) };
}

export function pointAt(path: WalkablePath, dist: number): { x: number; y: number; angle: number } {
  const d = Math.max(0, Math.min(path.total, dist));
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < d) i++;
  const a = path.pts[i - 1];
  const b = path.pts[i];
  const segLen = path.cum[i] - path.cum[i - 1] || 1;
  const t = (d - path.cum[i - 1]) / segLen;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
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
