import type { GameState, Station, StationShape, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { getMapCenter } from './camera';
import { distToSegment } from './geometry';
import { getUnlockedShapes } from './shapes';

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// True if pos sits too close to any segment of any drawn Line — new Stations shouldn't
// spawn on top of an existing route.
function tooCloseToAnyLine(state: GameState, pos: Vec2): boolean {
  for (const line of Object.values(state.lines)) {
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const a = state.stations[line.stationIds[i]]?.pos;
      const b = state.stations[line.stationIds[i + 1]]?.pos;
      if (!a || !b) continue;
      if (distToSegment(pos, a, b) < CONFIG.MIN_LINE_CLEARANCE) return true;
    }
  }
  return false;
}

const SHAPE_PREFIX: Record<StationShape, string> = {
  circle: 'C', triangle: 'T', square: 'S', star: 'X', hexagon: 'H', plus: 'U',
};

function nextLabel(state: GameState, shape: StationShape): string {
  const prefix = SHAPE_PREFIX[shape];
  const count = Object.values(state.stations).filter(s => s.shape === shape).length;
  return `${prefix}${count + 1}`;
}

function pickShape(state: GameState): StationShape {
  const shapes = getUnlockedShapes(state.weekNumber);
  const counts: Record<StationShape, number> = { circle: 0, triangle: 0, square: 0, star: 0, hexagon: 0, plus: 0 };
  for (const s of Object.values(state.stations)) {
    counts[s.shape]++;
  }
  const minCount = Math.min(...shapes.map(sh => counts[sh]));
  const candidates = shapes.filter(sh => counts[sh] === minCount);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function createInitialStations(state: GameState): void {
  const center = getMapCenter();
  // Fixed offsets from the map center — spread near the middle of the map,
  // never random. Mirrors the original 800x600 canvas layout, just re-anchored.
  const initial: Array<{ shape: StationShape; offset: Vec2 }> = [
    { shape: 'circle',   offset: { x: -220, y: -20 } },
    { shape: 'triangle', offset: { x: 0,    y: -120 } },
    { shape: 'square',   offset: { x: 220,  y: 20 } },
  ];
  for (const { shape, offset } of initial) {
    const pos: Vec2 = { x: center.x + offset.x, y: center.y + offset.y };
    const id = `s${++state.nextIds.station}`;
    const label = nextLabel(state, shape);
    state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [], riskTimer: null, spawnedAtMs: state.gameTimeMs };
  }
}

export function trySpawnStation(state: GameState): void {
  const stationList = Object.values(state.stations);
  if (stationList.length >= CONFIG.STATION_MAX_COUNT) return;

  const {
    WORLD_WIDTH, WORLD_HEIGHT, STATION_MARGIN, MIN_STATION_DISTANCE,
    STATION_MAX_COUNT, INITIAL_STATION_COUNT,
    STATION_SPAWN_MIN_HALF_WIDTH, STATION_SPAWN_MIN_HALF_HEIGHT, STATION_SPAWN_GROWTH_EXPONENT,
  } = CONFIG;
  const center = getMapCenter();
  const maxHalfW = WORLD_WIDTH / 2 - STATION_MARGIN;
  const maxHalfH = WORLD_HEIGHT / 2 - STATION_MARGIN;

  // Spawn extent grows from a tight box around the starting cluster out to the
  // full map as the station count climbs from INITIAL_STATION_COUNT to STATION_MAX_COUNT,
  // so new stations appear near the cluster first and only reach the map edges late.
  // Eased (rather than linear) so the box stays tight through most of the spawn
  // budget and only widens sharply near STATION_MAX_COUNT.
  const linearGrowth = Math.min(1, Math.max(0,
    (stationList.length - INITIAL_STATION_COUNT) / (STATION_MAX_COUNT - INITIAL_STATION_COUNT)
  ));
  const growth = Math.pow(linearGrowth, STATION_SPAWN_GROWTH_EXPONENT);
  const halfW = STATION_SPAWN_MIN_HALF_WIDTH + (maxHalfW - STATION_SPAWN_MIN_HALF_WIDTH) * growth;
  const halfH = STATION_SPAWN_MIN_HALF_HEIGHT + (maxHalfH - STATION_SPAWN_MIN_HALF_HEIGHT) * growth;

  for (let attempt = 0; attempt < 30; attempt++) {
    const pos: Vec2 = {
      x: center.x + (Math.random() * 2 - 1) * halfW,
      y: center.y + (Math.random() * 2 - 1) * halfH,
    };

    if (stationList.some(s => distance(s.pos, pos) < MIN_STATION_DISTANCE)) continue;
    if (tooCloseToAnyLine(state, pos)) continue;

    const id = `s${++state.nextIds.station}`;
    const shape = pickShape(state);
    const label = nextLabel(state, shape);
    state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [], riskTimer: null, spawnedAtMs: state.gameTimeMs };
    return;
  }
}

// Debug-only: place a station at exact position, bypassing distance constraints
export function trySpawnStationAt(state: GameState, pos: Vec2, shape: StationShape): void {
  const id = `s${++state.nextIds.station}`;
  const label = nextLabel(state, shape);
  state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [], riskTimer: null, spawnedAtMs: state.gameTimeMs };
}

export function getStationAt(state: GameState, pos: Vec2): Station | null {
  for (const station of Object.values(state.stations)) {
    if (distance(station.pos, pos) < CONFIG.STATION_RADIUS + 6) {
      return station;
    }
  }
  return null;
}
