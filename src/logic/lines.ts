import type { GameState, MetroLine, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { createTrain, redistributeTrains } from './trains';
import { buildSegmentShape, computeElbow, computeElbowRaw, distToSegment } from './geometry';

const SEGMENT_HIT_SAMPLES = 10; // sub-divisions used to hit-test the (mostly straight, corner-rounded) segment shape

// Below this angle, two lines' legs departing the same station read as visually
// overlapping rather than merely close — only worth fixing when it's this tight.
const BEND_CONFLICT_ANGLE = Math.PI / 6; // 30°

function legDirection(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function angleBetween(u: Vec2, v: Vec2): number {
  const dot = Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y));
  return Math.acos(dot);
}

// Direction each OTHER, earlier-drawn line departs `stationId` toward its neighbor(s)
// there — a proxy for "which way that track visually runs near this station", used to
// judge whether our own bend would overlap it. Only lines drawn before this one count:
// a line adapts to what's already on the board when it's drawn, but once drawn it never
// gets redrawn just because a later line shows up — otherwise every new line could ripple
// changes through tracks the player already routed.
function otherDepartureDirections(state: GameState, stationId: string, line: MetroLine): Vec2[] {
  const station = state.stations[stationId];
  if (!station || line.drawOrder == null) return [];
  const dirs: Vec2[] = [];
  for (const other of Object.values(state.lines)) {
    if (other.id === line.id) continue;
    if (other.drawOrder == null || other.drawOrder >= line.drawOrder) continue;
    const idx = other.stationIds.indexOf(stationId);
    if (idx === -1) continue;
    for (const ni of [idx - 1, idx + 1]) {
      const neighborPos = state.stations[other.stationIds[ni]]?.pos;
      if (neighborPos) dirs.push(legDirection(station.pos, neighborPos));
    }
  }
  return dirs;
}

function minAngleTo(dir: Vec2, others: Vec2[]): number {
  let min = Math.PI;
  for (const o of others) min = Math.min(min, angleBetween(dir, o));
  return min;
}

// Smallest departure-angle clearance this elbow choice gives at either endpoint against
// other lines already using that station — the thing we're trying to keep large.
function elbowClearance(elbow: Vec2, a: Vec2, b: Vec2, otherDirsA: Vec2[], otherDirsB: Vec2[]): number {
  return Math.min(
    minAngleTo(legDirection(a, elbow), otherDirsA),
    minAngleTo(legDirection(b, elbow), otherDirsB),
  );
}

// A bend can round the corner either "near a" (diagonal leg by a, flat leg by b) or
// mirrored (flat leg by a, diagonal leg by b) — computeElbow(a,b) gives the former,
// computeElbow(b,a) the latter. Both are equally valid tracks; we only prefer the
// mirror when the default one would visually overlap another line at a shared station,
// and only when the mirror is actually less crowded (never distort for no gain).
export function getSegmentElbow(state: GameState, line: MetroLine, index: number): Vec2 | null {
  const a = state.stations[line.stationIds[index]]?.pos;
  const b = state.stations[line.stationIds[index + 1]]?.pos;
  if (!a || !b) return null;

  const otherDirsA = otherDepartureDirections(state, line.stationIds[index], line);
  const otherDirsB = otherDepartureDirections(state, line.stationIds[index + 1], line);

  const defaultElbow = computeElbow(a, b);
  if (defaultElbow) {
    const defaultClearance = elbowClearance(defaultElbow, a, b, otherDirsA, otherDirsB);
    if (defaultClearance >= BEND_CONFLICT_ANGLE) return defaultElbow;

    const mirroredElbow = computeElbow(b, a);
    if (!mirroredElbow) return defaultElbow;
    const mirroredClearance = elbowClearance(mirroredElbow, a, b, otherDirsA, otherDirsB);
    return mirroredClearance > defaultClearance ? mirroredElbow : defaultElbow;
  }

  // No naturally nice-looking bend here (straight, 45°, or too axis-aligned to be worth
  // bending for style alone) — normally draw it straight. But if an earlier-drawn line's
  // track departs one of these stations close enough to read as overlapping, force a bend
  // anyway: better a short, stylistically-unwarranted kink than two lines drawn on top of
  // each other. Only kept if it actually beats the straight line; otherwise fall through to
  // straight (i.e. still intersects, same as before this line existed).
  const straightClearance = Math.min(
    minAngleTo(legDirection(a, b), otherDirsA),
    minAngleTo(legDirection(b, a), otherDirsB),
  );
  if (straightClearance >= BEND_CONFLICT_ANGLE) return null;

  let best: Vec2 | null = null;
  let bestClearance = straightClearance;
  for (const candidate of [computeElbowRaw(a, b), computeElbowRaw(b, a)]) {
    if (!candidate) continue;
    const clearance = elbowClearance(candidate, a, b, otherDirsA, otherDirsB);
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = candidate;
    }
  }
  return best;
}

// Finds a line segment (between two consecutive stations) near a point, for mid-line insertion drags.
// Hit-tests against the same shape rendering draws (straight legs with a short rounded corner at the
// bend, via buildSegmentShape), not a direct station-to-station line, so clicks land where the line looks like it is.
export function getSegmentAt(state: GameState, pos: Vec2): { lineId: string; afterIndex: number } | null {
  for (const line of Object.values(state.lines)) {
    if (!line.isUnlocked) continue;
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const a = state.stations[line.stationIds[i]]?.pos;
      const b = state.stations[line.stationIds[i + 1]]?.pos;
      if (!a || !b) continue;
      const shape = buildSegmentShape(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, i));

      let hit = false;
      let prev = a;
      for (let s = 1; s <= SEGMENT_HIT_SAMPLES; s++) {
        const p = shape.pointAt(s / SEGMENT_HIT_SAMPLES);
        if (distToSegment(pos, prev, p) <= CONFIG.LINE_HIT_RADIUS) { hit = true; break; }
        prev = p;
      }
      if (hit) return { lineId: line.id, afterIndex: i };
    }
  }
  return null;
}

export function createInitialLines(state: GameState): void {
  for (let i = 0; i < CONFIG.MAX_LINES; i++) {
    const id = `l${i + 1}`;
    state.lines[id] = {
      id,
      color: CONFIG.LINE_COLORS[i],
      stationIds: [],
      trainIds: [],
      isUnlocked: i < CONFIG.INITIAL_LINES_UNLOCKED,
      drawOrder: null,
    };
  }
}

export function getAvailableLine(state: GameState): MetroLine | null {
  for (const line of Object.values(state.lines)) {
    if (line.isUnlocked && line.stationIds.length === 0) return line;
  }
  return null;
}

export interface LineEndpoint {
  lineId: string;
  stationId: string;
  handlePos: Vec2;
}

// Handle position for one end of a line: projected past the terminal station,
// continuing the direction of the line's last segment (the little draggable stub/tab).
// `isFront` says whether `end` is the earlier station of the pair in stationIds order —
// the elbow must be computed in that same a→b order the renderer used for this segment
// (computeElbow is direction-dependent, not symmetric), or the tab points somewhere the
// drawn track never actually goes.
function endpointHandle(state: GameState, lineId: string, endId: string, neighborId: string, isFront: boolean): LineEndpoint | null {
  const end = state.stations[endId]?.pos;
  const neighbor = state.stations[neighborId]?.pos;
  const line = state.lines[lineId];
  if (!end || !neighbor || !line) return null;

  // The segment only curves right at the bend point — near the station itself the track is
  // always straight, so the tab direction is just the straight leg into the station: from the
  // elbow (if the segment bends) or the neighbor (if it doesn't). Goes through getSegmentElbow
  // (not a raw computeElbow call) so the tab matches whichever bend orientation got rendered.
  const index = isFront ? 0 : line.stationIds.length - 2;
  const elbow = getSegmentElbow(state, line, index);
  const from = elbow ?? neighbor;
  const dx = end.x - from.x;
  const dy = end.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    lineId,
    stationId: endId,
    handlePos: {
      x: end.x + (dx / len) * CONFIG.ENDPOINT_HANDLE_LENGTH,
      y: end.y + (dy / len) * CONFIG.ENDPOINT_HANDLE_LENGTH,
    },
  };
}

// One entry per end of every line with >=2 stations. A station can appear in
// multiple entries if several lines terminate there — each is a separate target.
export function getLineEndpoints(state: GameState): LineEndpoint[] {
  const endpoints: LineEndpoint[] = [];
  for (const line of Object.values(state.lines)) {
    if (line.stationIds.length < 2) continue;
    const firstId = line.stationIds[0];
    const lastId = line.stationIds[line.stationIds.length - 1];

    const front = endpointHandle(state, line.id, firstId, line.stationIds[1], true);
    const back = endpointHandle(state, line.id, lastId, line.stationIds[line.stationIds.length - 2], false);
    if (front) endpoints.push(front);
    if (back) endpoints.push(back);
  }
  return endpoints;
}

// Finds the closest line-end handle to a click position, for extending a specific
// line when a station has multiple lines terminating at it.
export function getLineEndpointAt(state: GameState, pos: Vec2): LineEndpoint | null {
  let closest: LineEndpoint | null = null;
  let closestDist: number = CONFIG.ENDPOINT_HANDLE_HIT_RADIUS;

  for (const ep of getLineEndpoints(state)) {
    const d = Math.hypot(pos.x - ep.handlePos.x, pos.y - ep.handlePos.y);
    if (d <= closestDist) {
      closest = ep;
      closestDist = d;
    }
  }
  return closest;
}

// Append a station to the end of a line (internal helper — no validation)
function appendStation(state: GameState, lineId: string, stationId: string): void {
  const line = state.lines[lineId];
  const station = state.stations[stationId];
  if (!line || !station || line.stationIds.includes(stationId)) return;

  line.stationIds.push(stationId);
  if (!station.lineIds.includes(lineId)) station.lineIds.push(lineId);

  if (line.stationIds.length === 2 && line.trainIds.length === 0) {
    line.drawOrder = ++state.nextIds.lineDraw;
    const train = createTrain(lineId, state);
    state.trains[train.id] = train;
    line.trainIds.push(train.id);
    redistributeTrains(lineId, state);
  }
}

// Prepend a station to the front of a line
function prependStation(state: GameState, lineId: string, stationId: string): void {
  const line = state.lines[lineId];
  const station = state.stations[stationId];
  if (!line || !station || line.stationIds.includes(stationId)) return;

  line.stationIds.unshift(stationId);
  if (!station.lineIds.includes(lineId)) station.lineIds.push(lineId);

  // Fix existing train indices — all shifted by 1 due to prepend
  // Do NOT redistribute: trains continue smoothly and will reach the new front station naturally
  for (const trainId of line.trainIds) {
    const train = state.trains[trainId];
    if (train) train.targetStationIndex += 1;
  }
}

// Public: add a station to a line, respecting end-only extension rule
// startStationId = the station the player dragged FROM (determines which end)
export function addStationToLine(
  state: GameState,
  lineId: string,
  endStationId: string,
  startStationId: string,
): void {
  const line = state.lines[lineId];
  if (!line) return;
  if (line.stationIds.includes(endStationId)) return;

  if (line.stationIds.length === 0) {
    appendStation(state, lineId, startStationId);
    appendStation(state, lineId, endStationId);
    return;
  }

  const firstId = line.stationIds[0];
  const lastId = line.stationIds[line.stationIds.length - 1];

  if (startStationId === lastId) {
    appendStation(state, lineId, endStationId);
  } else if (startStationId === firstId) {
    prependStation(state, lineId, endStationId);
  }
  // mid-line drag: silently ignore
}

// Insert a station into the middle of a line, splitting the segment after `afterIndex`
export function insertStationIntoLine(
  state: GameState,
  lineId: string,
  afterIndex: number,
  stationId: string,
): void {
  const line = state.lines[lineId];
  const station = state.stations[stationId];
  if (!line || !station || line.stationIds.includes(stationId)) return;
  if (afterIndex < 0 || afterIndex >= line.stationIds.length - 1) return;

  const insertAt = afterIndex + 1;

  // Trains currently crossing the segment being split need to be redirected through
  // the new station, rather than just shifting their target index like other trains
  const crossing = new Set<string>();
  for (const trainId of line.trainIds) {
    const train = state.trains[trainId];
    if (!train || train.state !== 'moving') continue;
    if (
      (train.direction === 1 && train.targetStationIndex === insertAt) ||
      (train.direction === -1 && train.targetStationIndex === afterIndex)
    ) {
      crossing.add(trainId);
    }
  }

  line.stationIds.splice(insertAt, 0, stationId);
  if (!station.lineIds.includes(lineId)) station.lineIds.push(lineId);

  for (const trainId of line.trainIds) {
    const train = state.trains[trainId];
    if (!train) continue;
    if (crossing.has(trainId)) {
      train.targetStationIndex = insertAt;
      train.progress = Math.min(train.progress, 0.98);
    } else if (train.targetStationIndex >= insertAt) {
      train.targetStationIndex += 1;
    }
  }
}

// Finds an active (unlocked, already has a Carrier) Line near a click point —
// used for assigning a Reserve Carrier from the Depot (core §2 Reserve).
export function getActiveLineAt(state: GameState, pos: Vec2): MetroLine | null {
  const hit = getSegmentAt(state, pos);
  if (!hit) return null;
  const line = state.lines[hit.lineId];
  if (!line || line.trainIds.length === 0) return null;
  return line;
}

// Unlocks Lines based purely on total station count, per progression.md §4 —
// re-checked every tick since it only reads current counts, never a schedule.
// Monotonic: target only grows as stations spawn, so this never re-locks a Line.
export function syncLineUnlocks(state: GameState): void {
  const stationCount = Object.keys(state.stations).length;
  const additional = Math.max(0, Math.floor(
    (stationCount - CONFIG.INITIAL_STATION_COUNT) / CONFIG.LINE_UNLOCK_STEP
  ));
  const targetUnlocked = Math.min(CONFIG.MAX_LINES, CONFIG.INITIAL_LINES_UNLOCKED + additional);

  let unlockedCount = 0;
  for (const line of Object.values(state.lines)) {
    if (unlockedCount < targetUnlocked) {
      line.isUnlocked = true;
      unlockedCount++;
    }
  }
}

export function addTrainToLine(state: GameState, lineId: string): boolean {
  const line = state.lines[lineId];
  if (!line || line.stationIds.length < 2) return false;
  const train = createTrain(lineId, state);
  state.trains[train.id] = train;
  line.trainIds.push(train.id);
  redistributeTrains(lineId, state);
  return true;
}

export function addCarriageToTrain(state: GameState, trainId: string): boolean {
  const train = state.trains[trainId];
  if (!train) return false;
  train.maxCapacity += CONFIG.CARRIAGE_CAPACITY_BONUS;
  train.carriageCount += 1;
  return true;
}
