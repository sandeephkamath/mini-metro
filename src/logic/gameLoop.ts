import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { trySpawnStation } from './stations';
import { trySpawnPassenger, getPassengerSpawnInterval } from './passengers';
import { tickTrains } from './trains';
import { checkOverflow } from './overflow';
import { processDelivery } from './delivery';

export function tick(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  const cappedDt = Math.min(dt, CONFIG.MAX_DT);
  state.gameTimeMs += cappedDt;

  if (state.gameTimeMs >= state.nextStationSpawnTime) {
    if (!state.debugPauseStations) trySpawnStation(state);
    state.nextStationSpawnTime = state.gameTimeMs + CONFIG.STATION_SPAWN_INTERVAL_MS;
  }

  if (state.gameTimeMs >= state.nextPassengerSpawnTime) {
    if (!state.debugPausePassengers) trySpawnPassenger(state);
    state.nextPassengerSpawnTime = state.gameTimeMs + getPassengerSpawnInterval(state.weekNumber);
  }

  tickTrains(state, cappedDt);

  checkOverflow(state);
  if ((state.phase as string) === 'gameover') return;

  if (state.gameTimeMs >= state.nextWeekTime) {
    state.weekNumber++;
    state.nextWeekTime = state.gameTimeMs + CONFIG.WEEK_DURATION_MS;
    processDelivery(state);
  }
}
