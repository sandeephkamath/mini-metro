import type { GameState, MetroLine, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { computeTrainPos, createTrain, redistributeTrains } from './trains';
import { worldHitRadius } from './camera';
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

// Direction each OTHER line's track actually departs `stationId`: toward the adjacent
// segment's stored elbow when it bends, else toward the far station. Elbow-accurate (not
// the straight station-to-station proxy) so two lines joining the same station pair read
// as a decisive 0°-clearance conflict instead of a symmetric tie — see B16 in
// themes/metro.md §10. Only used at segment creation; committed elbows never change.
function otherDepartureDirections(state: GameState, stationId: string, lineId: string): Vec2[] {
  const station = state.stations[stationId];
  if (!station) return [];
  const dirs: Vec2[] = [];
  for (const other of Object.values(state.lines)) {
    if (other.id === lineId) continue;
    for (let i = 0; i < other.stationIds.length - 1; i++) {
      const aId = other.stationIds[i];
      const bId = other.stationIds[i + 1];
      if (aId !== stationId && bId !== stationId) continue;
      const toward = other.elbows[i] ?? state.stations[aId === stationId ? bId : aId]?.pos;
      if (toward) dirs.push(legDirection(station.pos, toward));
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

// The frozen elbow for a committed segment — decided by chooseSegmentElbow when the
// segment was created, never recomputed (themes/metro.md §7 item 3 / bug B16).
export function getSegmentElbow(line: MetroLine, index: number): Vec2 | null {
  return line.elbows[index] ?? null;
}

// A bend can round the corner either "near a" (diagonal leg by a, flat leg by b) or
// mirrored (flat leg by a, diagonal leg by b) — computeElbow(a,b) gives the former,
// computeElbow(b,a) the latter. Both are equally valid tracks; we only prefer the
// mirror when the default one would visually overlap another line at a shared station,
// and only when the mirror is actually less crowded (never distort for no gain).
// Called once per segment, at creation — the result is stored and frozen so later
// drawing can never ripple changes through tracks the player already routed.
export function chooseSegmentElbow(state: GameState, lineId: string, aId: string, bId: string): Vec2 | null {
  const a = state.stations[aId]?.pos;
  const b = state.stations[bId]?.pos;
  if (!a || !b) return null;

  const otherDirsA = otherDepartureDirections(state, aId, lineId);
  const otherDirsB = otherDepartureDirections(state, bId, lineId);

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
  const hitRadius = worldHitRadius(state, CONFIG.LINE_HIT_RADIUS);
  for (const line of Object.values(state.lines)) {
    if (!line.isUnlocked) continue;
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const a = state.stations[line.stationIds[i]]?.pos;
      const b = state.stations[line.stationIds[i + 1]]?.pos;
      if (!a || !b) continue;
      const shape = buildSegmentShape(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(line, i));

      let hit = false;
      let prev = a;
      for (let s = 1; s <= SEGMENT_HIT_SAMPLES; s++) {
        const p = shape.pointAt(s / SEGMENT_HIT_SAMPLES);
        if (distToSegment(pos, prev, p) <= hitRadius) { hit = true; break; }
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
      elbows: [],
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

// Natural tab angle for one end of a line: continuing the direction of the line's last
// segment past the terminal station. `isFront` says whether `end` is the earlier station
// of the pair in stationIds order — the elbow must be computed in that same a→b order the
// renderer used for this segment (computeElbow is direction-dependent, not symmetric), or
// the tab points somewhere the drawn track never actually goes.
function endpointAngle(state: GameState, lineId: string, endId: string, neighborId: string, isFront: boolean): number | null {
  const end = state.stations[endId]?.pos;
  const neighbor = state.stations[neighborId]?.pos;
  const line = state.lines[lineId];
  if (!end || !neighbor || !line) return null;

  // The segment only curves right at the bend point — near the station itself the track is
  // always straight, so the tab direction is just the straight leg into the station: from the
  // elbow (if the segment bends) or the neighbor (if it doesn't). Goes through getSegmentElbow
  // (not a raw computeElbow call) so the tab matches whichever bend orientation got rendered.
  const index = isFront ? 0 : line.stationIds.length - 2;
  const elbow = getSegmentElbow(line, index);
  const from = elbow ?? neighbor;
  return Math.atan2(end.y - from.y, end.x - from.x);
}

// Relax a sorted ring of angles until every circular gap is at least minSep — tabs
// sharing a station fan apart instead of overlapping (core §4). Few items (max one
// per line), so a handful of passes converges plenty.
function spreadAngles(angles: number[], minSep: number): number[] {
  const n = angles.length;
  const a = [...angles];
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      let gap = a[j] - a[i];
      if (j === 0) gap += Math.PI * 2;
      if (gap < minSep) {
        const push = (minSep - gap) / 2;
        a[i] -= push;
        a[j] += push;
      }
    }
  }
  return a;
}

// One entry per end of every line with >=2 stations. A station can appear in multiple
// entries if several lines terminate there — each is a separate target, and tabs that
// would sit closer together than ENDPOINT_HANDLE_MIN_ANGLE are rotated apart so each
// stays individually grabbable.
export function getLineEndpoints(state: GameState): LineEndpoint[] {
  const raw: Array<{ lineId: string; stationId: string; angle: number }> = [];
  for (const line of Object.values(state.lines)) {
    if (line.stationIds.length < 2) continue;
    const firstId = line.stationIds[0];
    const lastId = line.stationIds[line.stationIds.length - 1];

    const front = endpointAngle(state, line.id, firstId, line.stationIds[1], true);
    const back = endpointAngle(state, line.id, lastId, line.stationIds[line.stationIds.length - 2], false);
    if (front !== null) raw.push({ lineId: line.id, stationId: firstId, angle: front });
    if (back !== null) raw.push({ lineId: line.id, stationId: lastId, angle: back });
  }

  const byStation = new Map<string, typeof raw>();
  for (const ep of raw) {
    const group = byStation.get(ep.stationId);
    if (group) group.push(ep); else byStation.set(ep.stationId, [ep]);
  }

  const endpoints: LineEndpoint[] = [];
  for (const [stationId, group] of byStation) {
    const station = state.stations[stationId];
    if (!station) continue;
    group.sort((x, y) => x.angle - y.angle);
    const angles = group.length > 1
      ? spreadAngles(group.map(g => g.angle), CONFIG.ENDPOINT_HANDLE_MIN_ANGLE)
      : [group[0].angle];
    for (let i = 0; i < group.length; i++) {
      endpoints.push({
        lineId: group[i].lineId,
        stationId,
        handlePos: {
          x: station.pos.x + Math.cos(angles[i]) * CONFIG.ENDPOINT_HANDLE_LENGTH,
          y: station.pos.y + Math.sin(angles[i]) * CONFIG.ENDPOINT_HANDLE_LENGTH,
        },
      });
    }
  }
  return endpoints;
}

// Finds the closest line-end handle to a click position, for extending a specific
// line when a station has multiple lines terminating at it.
export function getLineEndpointAt(state: GameState, pos: Vec2): LineEndpoint | null {
  let closest: LineEndpoint | null = null;
  let closestDist: number = worldHitRadius(state, CONFIG.ENDPOINT_HANDLE_HIT_RADIUS);

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

  if (line.stationIds.length >= 1) {
    line.elbows.push(chooseSegmentElbow(state, lineId, line.stationIds[line.stationIds.length - 1], stationId));
  }
  line.stationIds.push(stationId);
  if (!station.lineIds.includes(lineId)) station.lineIds.push(lineId);

  if (line.stationIds.length === 2 && line.trainIds.length === 0) {
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

  line.elbows.unshift(chooseSegmentElbow(state, lineId, stationId, line.stationIds[0]));
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

  const prevId = line.stationIds[afterIndex];
  const nextId = line.stationIds[insertAt];
  line.stationIds.splice(insertAt, 0, stationId);
  if (!station.lineIds.includes(lineId)) station.lineIds.push(lineId);
  // The split segment's elbow is replaced by fresh choices for both halves.
  line.elbows.splice(afterIndex, 1,
    chooseSegmentElbow(state, lineId, prevId, stationId),
    chooseSegmentElbow(state, lineId, stationId, nextId),
  );

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

// ── Provisional drawing chain (core §4) ────────────────────────────────────
// While a drag is in progress, nothing below mutates the actual line — the chain
// and detach count live in state.drawing and are committed only on release.

// Stations of the line being dragged that will remain after pending detachments.
export function getRemainingLineStations(state: GameState): string[] {
  const d = state.drawing;
  if (!d.lineId) return [];
  const line = state.lines[d.lineId];
  if (!line || line.stationIds.length === 0) return [];
  if (d.extendEnd === 'front') return line.stationIds.slice(d.detachCount);
  if (d.extendEnd === 'back') return line.stationIds.slice(0, line.stationIds.length - d.detachCount);
  return line.stationIds;
}

// The provisional chain ordered outward from the dragged end: the (post-detach) terminal
// first, then every station chained this gesture. For a new-line drag it is just the
// path (path[0] = the start station).
export function getDrawingChain(state: GameState): string[] {
  const d = state.drawing;
  if (d.extendEnd === null) return d.path;
  const remaining = getRemainingLineStations(state);
  const terminal = d.extendEnd === 'front' ? remaining[0] : remaining[remaining.length - 1];
  return terminal ? [terminal, ...d.path] : d.path;
}

// Apply one hovered station to the in-progress gesture: append it to the chain, undo the
// most recent append (dragging back), or mark a terminal detachment (dragging inward from
// an end tab — the shorten gesture). See core §4 "During the drag".
export function chainDrawingStation(state: GameState, stationId: string): void {
  const d = state.drawing;
  if (d.insertAfterIndex !== null) return; // insertion drags stay single-station
  const chain = getDrawingChain(state);
  if (chain[chain.length - 1] === stationId) return;

  // In-gesture undo: dragging back onto the previous chain station pops the newest one.
  if (d.path.length > 0 && chain[chain.length - 2] === stationId) {
    d.path.pop();
    return;
  }

  const remaining = getRemainingLineStations(state);

  // Shorten: from an end tab with nothing chained yet, dragging onto the adjacent inward
  // station marks the terminal for detachment — never below 2 remaining stations.
  if (d.extendEnd !== null && d.path.length === 0 && remaining.length > 2) {
    const inward = d.extendEnd === 'front' ? remaining[1] : remaining[remaining.length - 2];
    if (stationId === inward) {
      d.detachCount += 1;
      return;
    }
  }

  if (!remaining.includes(stationId) && !d.path.includes(stationId)) {
    d.path.push(stationId);
  }
}

// Detach one terminal station from a line end (the shorten gesture, core §4). Trains that
// were on the removed segment — stopped at the removed station, heading to it, or departing
// it — relocate to the new terminal and continue inward; everything else keeps rolling
// undisturbed. Never shortens below 2 stations (full deletion is removeLine's job).
export function removeStationFromLineEnd(state: GameState, lineId: string, end: 'front' | 'back'): boolean {
  const line = state.lines[lineId];
  if (!line || line.stationIds.length <= 2) return false;

  const removedIndex = end === 'front' ? 0 : line.stationIds.length - 1;
  const removedId = line.stationIds[removedIndex];

  // Identify affected trains before the splice invalidates indices. A moving train
  // occupies the segment (targetStationIndex - direction, targetStationIndex); a stopped
  // train sits at targetStationIndex.
  const affected = new Set<string>();
  for (const trainId of line.trainIds) {
    const train = state.trains[trainId];
    if (!train) continue;
    const prevIndex = train.state === 'moving' ? train.targetStationIndex - train.direction : train.targetStationIndex;
    if (train.targetStationIndex === removedIndex || prevIndex === removedIndex) affected.add(trainId);
  }

  line.stationIds.splice(removedIndex, 1);
  if (end === 'front') line.elbows.shift(); else line.elbows.pop();
  const removedStation = state.stations[removedId];
  if (removedStation) {
    removedStation.lineIds = removedStation.lineIds.filter(id => id !== lineId);
  }

  const terminalIndex = end === 'front' ? 0 : line.stationIds.length - 1;
  for (const trainId of line.trainIds) {
    const train = state.trains[trainId];
    if (!train) continue;
    if (affected.has(trainId)) {
      // Snap to the new terminal, pause there, then head back inward.
      train.targetStationIndex = terminalIndex;
      train.direction = end === 'front' ? 1 : -1;
      train.progress = 1;
      train.state = 'stopped';
      train.stopTimer = CONFIG.STATION_STOP_MS;
      train.pos = computeTrainPos(train, line, state);
    } else if (end === 'front') {
      train.targetStationIndex -= 1; // everything shifted down by the front splice
    }
  }
  return true;
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
  train.carriageAttachedAtMs.push(state.gameTimeMs);
  return true;
}

// Deletes an entire Line: removes its Trains (and whatever Passengers they were
// carrying — they're gone, not returned to any Station queue) and detaches every
// Station that was only reachable via this Line. The Line color stays unlocked
// and immediately reusable for a fresh Route, matching the original's "hold the
// Line's own legend swatch to purge it" gesture — see
// specs/mini_metro_original_analysis_2_ui_timing.md §5.
export function removeLine(state: GameState, lineId: string): boolean {
  const line = state.lines[lineId];
  if (!line || line.stationIds.length === 0) return false;

  if (state.drawing.lineId === lineId) {
    state.drawing = {
      isDrawing: false, lineId: null, startStationId: null,
      insertAfterIndex: null, grabPos: null, mousePos: state.drawing.mousePos,
      path: [], detachCount: 0, extendEnd: null,
    };
  }

  for (const trainId of line.trainIds) {
    delete state.trains[trainId];
  }

  for (const stationId of line.stationIds) {
    const station = state.stations[stationId];
    if (station) station.lineIds = station.lineIds.filter(id => id !== lineId);
  }

  line.stationIds = [];
  line.trainIds = [];
  line.elbows = [];
  return true;
}
