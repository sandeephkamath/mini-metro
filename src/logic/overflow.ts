import type { GameState } from '../types/game';

// A station at or over capacity enters Overflow Risk and starts a Grace Timer
// instead of ending the game immediately. Dropping back under capacity discards
// the timer; letting it reach zero while still over capacity ends the game.
export function updateOverflowRisk(state: GameState, dt: number): void {
  for (const station of Object.values(state.stations)) {
    const overCapacity = station.passengerQueue.length >= station.maxCapacity;

    if (!overCapacity) {
      station.riskTimer = null;
      continue;
    }

    if (station.riskTimer === null) {
      station.riskTimer = state.graceDurationMs;
    } else {
      station.riskTimer -= dt;
      if (station.riskTimer <= 0) {
        state.phase = 'gameover';
        return;
      }
    }
  }
}
