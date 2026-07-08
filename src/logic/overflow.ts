import type { GameState } from '../types/game';
import { canOfferContinue, offerGameOverContinue } from './monetization';

// A station at or over capacity enters Overflow Risk and starts a Grace Timer
// instead of ending the game immediately. Dropping back under capacity discards
// the timer; letting it reach zero while still over capacity ends the game —
// unless a Game-Over Continue is available, in which case an ad offer is
// presented instead (core/monetization.md §3) and the game doesn't end yet.
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
        if (canOfferContinue(state)) {
          offerGameOverContinue(state);
        } else {
          state.phase = 'gameover';
        }
        return;
      }
    }
  }
}
