import type { GameState, Station, StationShape, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const SHAPE_PREFIX: Record<StationShape, string> = { circle: 'C', triangle: 'T', square: 'S' };

function nextLabel(state: GameState, shape: StationShape): string {
  const prefix = SHAPE_PREFIX[shape];
  const count = Object.values(state.stations).filter(s => s.shape === shape).length;
  return `${prefix}${count + 1}`;
}

function pickShape(state: GameState): StationShape {
  const shapes: StationShape[] = ['circle', 'triangle', 'square'];
  const counts: Record<StationShape, number> = { circle: 0, triangle: 0, square: 0 };
  for (const s of Object.values(state.stations)) {
    counts[s.shape]++;
  }
  const minCount = Math.min(counts.circle, counts.triangle, counts.square);
  const candidates = shapes.filter(sh => counts[sh] === minCount);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function createInitialStations(state: GameState): void {
  // Fixed positions — spread across the canvas, never random
  const initial: Array<{ shape: StationShape; pos: Vec2 }> = [
    { shape: 'circle',   pos: { x: 180, y: 280 } },
    { shape: 'triangle', pos: { x: 400, y: 180 } },
    { shape: 'square',   pos: { x: 620, y: 320 } },
  ];
  for (const { shape, pos } of initial) {
    const id = `s${++state.nextIds.station}`;
    const label = nextLabel(state, shape);
    state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [] };
  }
}

export function trySpawnStation(state: GameState): void {
  const stationList = Object.values(state.stations);
  if (stationList.length >= CONFIG.STATION_MAX_COUNT) return;

  const { CANVAS_WIDTH, CANVAS_HEIGHT, STATION_MARGIN, MIN_STATION_DISTANCE } = CONFIG;

  for (let attempt = 0; attempt < 30; attempt++) {
    const pos: Vec2 = {
      x: STATION_MARGIN + Math.random() * (CANVAS_WIDTH - STATION_MARGIN * 2),
      y: STATION_MARGIN + Math.random() * (CANVAS_HEIGHT - STATION_MARGIN * 2),
    };

    if (stationList.some(s => distance(s.pos, pos) < MIN_STATION_DISTANCE)) continue;

    const id = `s${++state.nextIds.station}`;
    const shape = pickShape(state);
    const label = nextLabel(state, shape);
    state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [] };
    return;
  }
}

// Debug-only: place a station at exact position, bypassing distance constraints
export function trySpawnStationAt(state: GameState, pos: Vec2, shape: StationShape): void {
  const id = `s${++state.nextIds.station}`;
  const label = nextLabel(state, shape);
  state.stations[id] = { id, label, shape, pos, passengerQueue: [], maxCapacity: CONFIG.STATION_INITIAL_CAPACITY, lineIds: [] };
}

export function getStationAt(state: GameState, pos: Vec2): Station | null {
  for (const station of Object.values(state.stations)) {
    if (distance(station.pos, pos) < CONFIG.STATION_RADIUS + 6) {
      return station;
    }
  }
  return null;
}
