import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { trySpawnStation } from './stations';
import { trySpawnPassenger, getPassengerSpawnInterval } from './passengers';
import { tickTrains } from './trains';
import { updateOverflowRisk } from './overflow';
import { fireMilestoneEvent } from './milestone';
import { syncLineUnlocks } from './lines';
import { updateCameraAutoFit } from './camera';
import { tickTutorial, tutorialHoldsClock, exitTutorial } from './tutorial';

export function tick(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;
  // Presenting the Weekly Upgrade choice pauses every timer in the game — the
  // same mechanism as the phase !== 'playing' guard above (core §6 Game Clock).
  if (state.milestoneChoicePending) return;
  // The tutorial owns the clock while active (specs/TUTORIAL.md §2): its step
  // conditions are checked every frame (line commits happen via input, not ticks),
  // and card steps freeze simulation time via the same guard as pause.
  if (state.tutorial) {
    tickTutorial(state, Math.min(dt, CONFIG.MAX_DT));
    if (tutorialHoldsClock(state)) return;
  } else if (state.playerPaused && !state.debugMode) {
    // Player-facing Pause button uses the same guard — drawing/editing stays live,
    // only simulation time freezes (core §6 Game Clock). While debug mode is on, the
    // keyed debug speed takes precedence over the player's HUD selection (DEBUG.md
    // Speed Control) — debug speed 0 already pauses via a zero dt multiplier.
    return;
  }

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

  // passengerFx is appended in time order, so expired entries are always at the front
  while (state.passengerFx.length > 0 && state.gameTimeMs - state.passengerFx[0].atMs > CONFIG.PASSENGER_FX_MS) {
    state.passengerFx.shift();
  }

  updateOverflowRisk(state, cappedDt);
  if ((state.phase as string) === 'gameover') {
    if (state.tutorial) exitTutorial(state);
    return;
  }

  // Advance nextWeekTime/nextMilestoneTime from their own prior (exact-multiple) value,
  // not from the current (possibly overshot, per-tick-capped) gameTimeMs — otherwise each
  // firing's overshoot compounds into the next threshold, and since MILESTONE_EVENT_WEEKS
  // weeks' worth of week-boundary overshoot can add up to more than a single week-boundary
  // overshoot, nextWeekTime can drift past nextMilestoneTime by the time a milestone week
  // is reached. That desync freezes weekNumber one short forever once the (still-exact)
  // milestone check pauses the clock before the (now-late) week check ever fires again —
  // see themes/metro.md §11 B12.
  if (state.gameTimeMs >= state.nextWeekTime) {
    state.weekNumber++;
    state.nextWeekTime += CONFIG.WEEK_DURATION_MS;
  }

  if (state.gameTimeMs >= state.nextMilestoneTime) {
    state.level++;
    state.nextMilestoneTime += CONFIG.WEEK_DURATION_MS * CONFIG.MILESTONE_EVENT_WEEKS;
    fireMilestoneEvent(state);
  }
}
