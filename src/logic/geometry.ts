import type { Vec2 } from '../types/game';

export function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

// Control point between two stations, mimicking classic Mini Metro routing: a diagonal
// run then a straight run, rather than one direct diagonal between the two stations.
// Returns null when the direct path is already straight or 45° (no bend needed).
export function computeElbow(a: Vec2, b: Vec2): Vec2 | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < 2 || ady < 2 || Math.abs(adx - ady) < 2) return null;
  const d = Math.min(adx, ady);
  return { x: a.x + Math.sign(dx) * d, y: a.y + Math.sign(dy) * d };
}

// Point at parameter t (0..1) along the quadratic bezier from a to b with control point e.
export function quadraticPoint(a: Vec2, e: Vec2, b: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * e.x + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * e.y + t * t * b.y,
  };
}

// Unnormalized tangent direction at parameter t along the same curve.
export function quadraticTangent(a: Vec2, e: Vec2, b: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: 2 * mt * (e.x - a.x) + 2 * t * (b.x - e.x),
    y: 2 * mt * (e.y - a.y) + 2 * t * (b.y - e.y),
  };
}

// Approximate arc length by sampling — a quadratic bezier has no closed-form length, and
// sampling is accurate enough to keep Train speed visually consistent through a bend.
export function quadraticLength(a: Vec2, e: Vec2, b: Vec2, samples = 8): number {
  let total = 0;
  let prev = a;
  for (let i = 1; i <= samples; i++) {
    const p = quadraticPoint(a, e, b, i / samples);
    total += dist(prev, p);
    prev = p;
  }
  return total;
}

// A station-to-station segment that bends: mostly two straight legs (a→t1, t2→b), with
// only a short quadratic curve rounding off the corner at the elbow — not a curve along
// the whole segment. t1/t2 sit `radius` px back from the elbow along each straight leg.
export interface BentSegment {
  a: Vec2;
  t1: Vec2;
  elbow: Vec2;
  t2: Vec2;
  b: Vec2;
  straightLen1: number;
  curveLen: number;
  straightLen2: number;
}

export function computeBentSegment(a: Vec2, b: Vec2, radius: number): BentSegment | null {
  const elbow = computeElbow(a, b);
  if (!elbow) return null;
  const legA = dist(a, elbow);
  const legB = dist(elbow, b);
  const r = Math.min(radius, legA * 0.5, legB * 0.5);
  if (r < 1) return null; // legs too short to bother rounding — draw the elbow as-is (straight lineTo)

  const t1 = lerp(elbow, a, r / legA);
  const t2 = lerp(elbow, b, r / legB);
  return {
    a, t1, elbow, t2, b,
    straightLen1: dist(a, t1),
    curveLen: quadraticLength(t1, elbow, t2),
    straightLen2: dist(t2, b),
  };
}

function bentSegmentTotalLength(seg: BentSegment): number {
  return seg.straightLen1 + seg.curveLen + seg.straightLen2;
}

function bentSegmentPointAt(seg: BentSegment, t: number): Vec2 {
  const traveled = t * bentSegmentTotalLength(seg);
  if (traveled <= seg.straightLen1) {
    return lerp(seg.a, seg.t1, seg.straightLen1 > 0 ? traveled / seg.straightLen1 : 0);
  }
  if (traveled <= seg.straightLen1 + seg.curveLen) {
    const localT = seg.curveLen > 0 ? (traveled - seg.straightLen1) / seg.curveLen : 0;
    return quadraticPoint(seg.t1, seg.elbow, seg.t2, localT);
  }
  const remaining = traveled - seg.straightLen1 - seg.curveLen;
  return lerp(seg.t2, seg.b, seg.straightLen2 > 0 ? remaining / seg.straightLen2 : 0);
}

function bentSegmentTangentAt(seg: BentSegment, t: number): Vec2 {
  const traveled = t * bentSegmentTotalLength(seg);
  if (traveled <= seg.straightLen1) {
    return { x: seg.t1.x - seg.a.x, y: seg.t1.y - seg.a.y };
  }
  if (traveled <= seg.straightLen1 + seg.curveLen) {
    const localT = seg.curveLen > 0 ? (traveled - seg.straightLen1) / seg.curveLen : 0;
    return quadraticTangent(seg.t1, seg.elbow, seg.t2, localT);
  }
  return { x: seg.b.x - seg.t2.x, y: seg.b.y - seg.t2.y };
}

// Uniform query interface over a station-to-station segment, straight or bent — used by
// Train movement and hit-testing so both read the exact same shape rendering draws.
export interface SegmentShape {
  length: number;
  pointAt(t: number): Vec2;
  tangentAt(t: number): Vec2;
}

export function buildSegmentShape(a: Vec2, b: Vec2, cornerRadius: number): SegmentShape {
  const seg = computeBentSegment(a, b, cornerRadius);
  if (!seg) {
    return {
      length: dist(a, b),
      pointAt: (t: number) => lerp(a, b, t),
      tangentAt: () => ({ x: b.x - a.x, y: b.y - a.y }),
    };
  }
  return {
    length: bentSegmentTotalLength(seg),
    pointAt: (t: number) => bentSegmentPointAt(seg, t),
    tangentAt: (t: number) => bentSegmentTangentAt(seg, t),
  };
}
