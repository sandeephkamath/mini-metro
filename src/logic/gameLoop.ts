import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { trySpawnStation } from './stations';
import { trySpawnPassenger, getPassengerSpawnInterval } from './passengers';
import { tickTrains } from './trains';
import { updateOverflowRisk } from './overflow';
import { fireMilestoneEvent } from './milestone';
import { syncLineUnlocks } from './lines';
import { updateCameraAutoFit } from './camera';

export function tick(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;
  // Presenting the Weekly Upgrade choice pauses every timer in the game — the
  // same mechanism as the phase !== 'playing' guard above (core §6 Game Clock).
  if (state.milestoneChoicePending) return;
  // Player-facing Pause button uses the same guard — drawing/editing stays live,
  // only simulation time freezes (core §6 Game Clock).
  if (state.playerPaused) return;

  const cappedDt = Math.min(dt, CONFIG.MAX_DT);
  state.gameTimeMs += cappedDt;

  updateCameraAutoFit(state, cappedDt);

  if (state.gameTimeMs >= state.nextStationSpawnTime) {
    if (!state.debugPauseStations) trySpawnStation(state);
    state.nextStationSpawnTime = state.gameTimeMs + CONFIG.STATION_SPAWN_INTERVAL_MS;
  }
  syncLineUnlocks(state);

  if (state.gameTimeMs >= state.nextPassengerSpawnTime) {
    if (!state.debugPausePassengers) trySpawnPassenger(state);
    state.nextPassengerSpawnTime = state.gameTimeMs + getPassengerSpawnInterval(state.weekNumber);
  }

  tickTrains(state, cappedDt);

  updateOverflowRisk(state, cappedDt);
  if ((state.phase as string) === 'gameover') return;

  if (state.gameTimeMs >= state.nextWeekTime) {
    state.weekNumber++;
    state.nextWeekTime = state.gameTimeMs + CONFIG.WEEK_DURATION_MS;
  }

  if (state.gameTimeMs >= state.nextMilestoneTime) {
    state.level++;
    state.nextMilestoneTime = state.gameTimeMs + CONFIG.WEEK_DURATION_MS * CONFIG.MILESTONE_EVENT_WEEKS;
    fireMilestoneEvent(state);
  }
}
