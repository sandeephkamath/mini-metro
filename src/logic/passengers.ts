import type { GameState, Passenger, StationShape, Train } from '../types/game';
import { CONFIG } from '../config/gameConfig';


const ALL_SHAPES: StationShape[] = ['circle', 'triangle', 'square'];

export function trySpawnPassenger(state: GameState): boolean {
  const stations = Object.values(state.stations);
  const eligible = stations.filter(s => s.passengerQueue.length < s.maxCapacity);
  if (eligible.length === 0) return false;

  const station = eligible[Math.floor(Math.random() * eligible.length)];
  const otherShapes = ALL_SHAPES.filter(sh => sh !== station.shape);
  const validDests = otherShapes.filter(sh => stations.some(s => s.shape === sh));
  if (validDests.length === 0) return false;

  const destShape = validDests[Math.floor(Math.random() * validDests.length)];
  station.passengerQueue.push({
    id: `p${++state.nextIds.passenger}`,
    destinationShape: destShape,
    originStationId: station.id,
  });
  return true;
}

export function canReach(train: Train, passenger: Passenger, state: GameState): boolean {
  const line = state.lines[train.lineId];
  if (!line) return false;

  const visited = new Set<string>();
  const queue: string[] = [...line.stationIds];

  while (queue.length > 0) {
    const sid = queue.shift()!;
    if (visited.has(sid)) continue;
    visited.add(sid);

    const station = state.stations[sid];
    if (!station) continue;
    if (station.shape === passenger.destinationShape) return true;

    for (const lineId of station.lineIds) {
      const connectedLine = state.lines[lineId];
      if (!connectedLine) continue;
      for (const connSid of connectedLine.stationIds) {
        if (!visited.has(connSid)) queue.push(connSid);
      }
    }
  }

  return false;
}

export function getPassengerSpawnInterval(weekNumber: number): number {
  const interval = CONFIG.BASE_PASSENGER_SPAWN_MS * Math.pow(CONFIG.PASSENGER_SPAWN_RATE_DECAY, weekNumber);
  return Math.max(CONFIG.PASSENGER_SPAWN_INTERVAL_MIN_MS, interval);
}
