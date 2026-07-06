import type { GameState, Train, Vec2, MetroLine, Station, Passenger } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { dist, buildSegmentShape } from './geometry';
import { getSegmentElbow } from './lines';

const SYM: Record<string, string> = { circle: '●', triangle: '▲', square: '■' };
function sym(shape: string) { return SYM[shape] ?? '?'; }

function log(state: GameState, train: Train, msg: string): void {
  if (!state.debugMode) return;
  const prefix = `[${train.id}]`;
  state.debugLog.push(`${prefix} ${msg}`);
  if (state.debugLog.length > 30) state.debugLog.shift();
}

function lineLength(line: MetroLine, state: GameState): number {
  let total = 0;
  for (let i = 0; i < line.stationIds.length - 1; i++) {
    const a = state.stations[line.stationIds[i]]?.pos;
    const b = state.stations[line.stationIds[i + 1]]?.pos;
    if (a && b) total += buildSegmentShape(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, i)).length;
  }
  return total;
}

function segmentLength(line: MetroLine, targetIndex: number, direction: number, state: GameState): number {
  const prevIndex = targetIndex - direction;
  if (prevIndex < 0 || prevIndex >= line.stationIds.length) return 1;
  const lowIndex = Math.min(prevIndex, targetIndex);
  const highIndex = Math.max(prevIndex, targetIndex);
  const a = state.stations[line.stationIds[lowIndex]]?.pos;
  const b = state.stations[line.stationIds[highIndex]]?.pos;
  if (!a || !b) return 1;
  return Math.max(1, buildSegmentShape(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, lowIndex)).length);
}

// computeElbow (inside buildSegmentShape) isn't symmetric — the diagonal leg always sits next
// to whichever point is passed first, so computeElbow(a,b) and computeElbow(b,a) bend in
// different places. Rendering always builds a segment's shape in ascending station-index order
// (stationIds[i] -> stationIds[i+1]); a Train traveling backward (high index -> low index) must
// sample that *same* shape rather than rebuild it with from/to swapped, or its bend lands
// somewhere the rendered line never goes — which is why trains only drifted off-track on return trips.
function sampleTrainSegment(train: Train, line: MetroLine, state: GameState): { pos: Vec2; tangent: Vec2 } | null {
  const prevIndex = train.targetStationIndex - train.direction;
  if (prevIndex < 0 || prevIndex >= line.stationIds.length) return null;

  const lowIndex = Math.min(prevIndex, train.targetStationIndex);
  const highIndex = Math.max(prevIndex, train.targetStationIndex);
  const a = state.stations[line.stationIds[lowIndex]]?.pos;
  const b = state.stations[line.stationIds[highIndex]]?.pos;
  if (!a || !b) return null;

  const shape = buildSegmentShape(a, b, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, lowIndex));
  // train.progress runs 0→1 from wherever it departed toward wherever it's headed. The shape
  // is always parametrized low-index-end (t=0) to high-index-end (t=1), so moving forward
  // (departed low, heading high) maps progress directly; moving backward, it's reversed.
  const t = train.direction === 1 ? train.progress : 1 - train.progress;
  const tangent = shape.tangentAt(t);
  if (train.direction === -1) { tangent.x = -tangent.x; tangent.y = -tangent.y; }
  return { pos: shape.pointAt(t), tangent };
}

// Train position follows the exact same shape renderLines draws (straight legs with a short
// rounded corner at the bend, via buildSegmentShape) — previously this lerped straight between
// station centers even when the rendered track bent, so trains visibly cut corners.
export function computeTrainPos(train: Train, line: MetroLine, state: GameState): Vec2 {
  const sample = sampleTrainSegment(train, line, state);
  if (!sample) return state.stations[line.stationIds[train.targetStationIndex]]?.pos ?? { x: 0, y: 0 };
  return sample.pos;
}

// Facing angle along the same shape as computeTrainPos, for rendering rotation — smoothly
// rotates through a bend instead of snapping to a new fixed angle only at each station.
export function computeTrainAngle(train: Train, line: MetroLine, state: GameState): number {
  const sample = sampleTrainSegment(train, line, state);
  if (!sample) return 0;
  return Math.atan2(sample.tangent.y, sample.tangent.x);
}

// A passenger should board only if the train can deliver them within one transfer:
// either a future stop IS their destination, or a future stop has a connecting line
// that directly contains their destination. Unbounded BFS causes passengers to
// re-board trains they just transferred off of via a distant multi-hop path.
function canReachAhead(train: Train, passenger: Passenger, state: GameState): boolean {
  const line = state.lines[train.lineId];
  if (!line) return false;

  const currentIdx = train.targetStationIndex;

  // At endpoints the train is about to reverse; compute effective departure direction
  const nextIdx = currentIdx + train.direction;
  const effectiveDir = (nextIdx < 0 || nextIdx >= line.stationIds.length)
    ? (-train.direction as 1 | -1)
    : train.direction;

  // Future stops only — exclude the current (departing) station
  const futureIndices: number[] = [];
  if (effectiveDir === 1) {
    for (let i = currentIdx + 1; i < line.stationIds.length; i++) futureIndices.push(i);
  } else {
    for (let i = currentIdx - 1; i >= 0; i--) futureIndices.push(i);
  }

  // 1. Direct delivery: destination is on this train's own future stops — always board
  for (const idx of futureIndices) {
    const s = state.stations[line.stationIds[idx]];
    if (s?.shape === passenger.destinationShape) return true;
  }

  // 2. Transfer boarding: only consider if the current station doesn't already have a
  //    different line that serves the destination directly. If it does, the passenger
  //    should wait for that connecting train (prevents bouncing between transfer stations).
  const currentStation = state.stations[line.stationIds[currentIdx]];
  if (currentStation) {
    for (const connLineId of currentStation.lineIds) {
      if (connLineId === train.lineId) continue;
      const conn = state.lines[connLineId];
      if (conn?.stationIds.some(sid => state.stations[sid]?.shape === passenger.destinationShape)) {
        return false; // a direct connecting train will come — wait for it
      }
    }
  }

  // 3. One-hop transfer at a future stop
  for (const idx of futureIndices) {
    const s = state.stations[line.stationIds[idx]];
    if (!s) continue;
    for (const connLineId of s.lineIds) {
      if (connLineId === train.lineId) continue;
      const conn = state.lines[connLineId];
      if (conn?.stationIds.some(sid => state.stations[sid]?.shape === passenger.destinationShape)) return true;
    }
  }
  return false;
}

function boardPassengers(train: Train, stationId: string, state: GameState): void {
  const station = state.stations[stationId];
  if (!station) return;

  const remaining: typeof station.passengerQueue = [];
  for (const passenger of station.passengerQueue) {
    if (train.passengers.length < train.maxCapacity && canReachAhead(train, passenger, state)) {
      train.passengers.push(passenger);
      state.passengerFx.push({ stationId: station.id, shape: passenger.destinationShape, kind: 'board', atMs: state.gameTimeMs });
      log(state, train, `@${sym(station.shape)} boarded ${sym(passenger.destinationShape)}`);
    } else if (state.debugMode && !canReachAhead(train, passenger, state)) {
      log(state, train, `@${sym(station.shape)} skipped ${sym(passenger.destinationShape)} (wrong dir)`);
      remaining.push(passenger);
    } else {
      remaining.push(passenger);
    }
  }
  station.passengerQueue = remaining;
}

// Returns true if this station is the right place for the passenger to transfer.
// Condition: the current line has no station with the passenger's destination shape,
// but a *different* line at this station directly has that shape.
function shouldTransferHere(train: Train, passenger: Passenger, station: Station, state: GameState): boolean {
  const line = state.lines[train.lineId];
  if (!line) return false;
  const destOnCurrentLine = line.stationIds.some(sid => state.stations[sid]?.shape === passenger.destinationShape);
  if (destOnCurrentLine) return false;
  for (const connLineId of station.lineIds) {
    if (connLineId === train.lineId) continue;
    const conn = state.lines[connLineId];
    if (conn?.stationIds.some(sid => state.stations[sid]?.shape === passenger.destinationShape)) return true;
  }
  return false;
}

function disembarkPassengers(train: Train, stationId: string, state: GameState): void {
  const station = state.stations[stationId];
  if (!station) return;

  const remaining: typeof train.passengers = [];
  for (const p of train.passengers) {
    if (p.destinationShape === station.shape) {
      state.score += 1;
      state.passengerFx.push({ stationId: station.id, shape: p.destinationShape, kind: 'deliver', atMs: state.gameTimeMs });
      log(state, train, `@${sym(station.shape)} delivered ${sym(p.destinationShape)} ✓`);
    } else if (shouldTransferHere(train, p, station, state) && station.passengerQueue.length < station.maxCapacity) {
      p.queuedAtMs = state.gameTimeMs;
      station.passengerQueue.push(p);
      log(state, train, `@${sym(station.shape)} transfer ${sym(p.destinationShape)} → waiting`);
    } else {
      remaining.push(p);
    }
  }
  train.passengers = remaining;
}

export function tickTrains(state: GameState, dt: number): void {
  for (const train of Object.values(state.trains)) {
    const line = state.lines[train.lineId];
    if (!line || line.stationIds.length < 2) continue;

    if (train.state === 'stopped') {
      train.stopTimer -= dt;
      if (train.stopTimer <= 0) {
        // Board just before departing — passengers transferred off this train during arrival
        // have been sitting in the queue during the stop and won't re-board this train
        const currentStationId = line.stationIds[train.targetStationIndex];
        boardPassengers(train, currentStationId, state);

        train.state = 'moving';
        const nextIdx = train.targetStationIndex + train.direction;
        if (nextIdx < 0 || nextIdx >= line.stationIds.length) {
          train.direction = (train.direction === 1 ? -1 : 1) as 1 | -1;
          train.targetStationIndex += train.direction;
        } else {
          train.targetStationIndex = nextIdx;
        }
        train.progress = 0;
      }
    } else {
      const segLen = segmentLength(line, train.targetStationIndex, train.direction, state);
      train.progress += (CONFIG.TRAIN_SPEED_PX_PER_SEC * dt) / 1000 / segLen;

      if (train.progress >= 1.0) {
        train.progress = 1.0;
        const arrivedId = line.stationIds[train.targetStationIndex];
        // Disembark on arrival only — boarding happens at departure to prevent re-boarding
        disembarkPassengers(train, arrivedId, state);
        train.state = 'stopped';
        train.stopTimer = CONFIG.STATION_STOP_MS;
      }
    }

    train.pos = computeTrainPos(train, line, state);
  }
}

// Place all trains on a line at evenly-spaced positions along its full length
export function redistributeTrains(lineId: string, state: GameState): void {
  const line = state.lines[lineId];
  if (!line || line.stationIds.length < 2 || line.trainIds.length === 0) return;

  const trains = line.trainIds.map(id => state.trains[id]).filter(Boolean) as Train[];
  const N = trains.length;
  const total = lineLength(line, state);
  if (total === 0) return;

  for (let i = 0; i < N; i++) {
    const targetDist = total * i / N;
    let cumLen = 0;

    for (let segIdx = 0; segIdx < line.stationIds.length - 1; segIdx++) {
      const from = state.stations[line.stationIds[segIdx]]?.pos;
      const to = state.stations[line.stationIds[segIdx + 1]]?.pos;
      if (!from || !to) continue;

      const segLen = buildSegmentShape(from, to, CONFIG.LINE_BEND_RADIUS, getSegmentElbow(state, line, segIdx)).length;
      if (cumLen + segLen >= targetDist) {
        const progress = segLen > 0 ? Math.min((targetDist - cumLen) / segLen, 0.999) : 0;
        trains[i].targetStationIndex = segIdx + 1;
        trains[i].direction = 1;
        trains[i].progress = progress;
        trains[i].state = 'moving';
        trains[i].stopTimer = 0;
        trains[i].pos = computeTrainPos(trains[i], line, state);
        break;
      }
      cumLen += segLen;
    }
  }
}

// Hit-test a click against in-service Trains, for attaching a Reserve Carriage
// from the Depot (core §2 Reserve).
export function getTrainAt(state: GameState, pos: Vec2): Train | null {
  for (const train of Object.values(state.trains)) {
    const bodyLength = CONFIG.TRAIN_WIDTH + (train.carriageCount - 1) * (CONFIG.TRAIN_WIDTH + CONFIG.CARRIAGE_GAP);
    const hitRadius = CONFIG.TRAIN_WIDTH / 2 + bodyLength;
    if (dist(train.pos, pos) <= hitRadius) return train;
  }
  return null;
}

export function createTrain(lineId: string, state: GameState): Train {
  const line = state.lines[lineId];
  const startPos = line?.stationIds[0]
    ? { ...(state.stations[line.stationIds[0]]?.pos ?? { x: 0, y: 0 }) }
    : { x: 0, y: 0 };

  return {
    id: `t${++state.nextIds.train}`,
    lineId,
    passengers: [],
    maxCapacity: CONFIG.TRAIN_INITIAL_CAPACITY,
    carriageCount: 1,
    pos: startPos,
    targetStationIndex: 1,
    direction: 1,
    progress: 0,
    state: 'moving',
    stopTimer: 0,
    spawnedAtMs: state.gameTimeMs,
  };
}
