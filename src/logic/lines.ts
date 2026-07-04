import type { GameState, MetroLine, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { createTrain, redistributeTrains } from './trains';

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Finds a line segment (between two consecutive stations) near a point, for mid-line insertion drags
export function getSegmentAt(state: GameState, pos: Vec2): { lineId: string; afterIndex: number } | null {
  for (const line of Object.values(state.lines)) {
    if (!line.isUnlocked) continue;
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const a = state.stations[line.stationIds[i]]?.pos;
      const b = state.stations[line.stationIds[i + 1]]?.pos;
      if (!a || !b) continue;
      if (distToSegment(pos, a, b) <= CONFIG.LINE_HIT_RADIUS) {
        return { lineId: line.id, afterIndex: i };
      }
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
function endpointHandle(state: GameState, lineId: string, endId: string, neighborId: string): LineEndpoint | null {
  const end = state.stations[endId]?.pos;
  const neighbor = state.stations[neighborId]?.pos;
  if (!end || !neighbor) return null;

  const dx = end.x - neighbor.x;
  const dy = end.y - neighbor.y;
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

    const front = endpointHandle(state, line.id, firstId, line.stationIds[1]);
    const back = endpointHandle(state, line.id, lastId, line.stationIds[line.stationIds.length - 2]);
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

export function unlockNextLine(state: GameState): boolean {
  for (const line of Object.values(state.lines)) {
    if (!line.isUnlocked) {
      line.isUnlocked = true;
      return true;
    }
  }
  return false;
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
  train.maxCapacity += 2;
  return true;
}
