import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { ALL_SHAPES } from './shapes';

export function trySpawnPassenger(state: GameState): boolean {
  const stations = Object.values(state.stations);
  const eligible = stations.filter(s => s.passengerQueue.length < s.maxCapacity);
  if (eligible.length === 0) return false;

  const fraction = getPassengerSpawnBatchFraction(state.weekNumber);
  const batchSize = Math.max(1, Math.round(eligible.length * fraction));
  const targets = [...eligible].sort(() => Math.random() - 0.5).slice(0, batchSize);

  let spawnedAny = false;
  for (const station of targets) {
    const otherShapes = ALL_SHAPES.filter(sh => sh !== station.shape);
    const validDests = otherShapes.filter(sh => stations.some(s => s.shape === sh));
    if (validDests.length === 0) continue;

    const destShape = validDests[Math.floor(Math.random() * validDests.length)];
    station.passengerQueue.push({
      id: `p${++state.nextIds.passenger}`,
      destinationShape: destShape,
      originStationId: station.id,
      queuedAtMs: state.gameTimeMs,
    });
    spawnedAny = true;
  }
  return spawnedAny;
}

export function getPassengerSpawnInterval(weekNumber: number): number {
  const interval = CONFIG.BASE_PASSENGER_SPAWN_MS * Math.pow(CONFIG.PASSENGER_SPAWN_RATE_DECAY, weekNumber);
  return Math.max(CONFIG.PASSENGER_SPAWN_INTERVAL_MIN_MS, interval);
}

export function getPassengerSpawnBatchFraction(weekNumber: number): number {
  const fraction = CONFIG.PASSENGER_SPAWN_BATCH_BASE_FRACTION * Math.pow(CONFIG.PASSENGER_SPAWN_BATCH_GROWTH_RATE, weekNumber);
  return Math.min(CONFIG.PASSENGER_SPAWN_BATCH_MAX_FRACTION, fraction);
}
