import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { canOfferContinue, offerGameOverContinue } from './monetization';
import { relieveStation } from './stationRelief';

// A station at or over capacity, OR with any single passenger waiting past the
// Passenger Patience Limit, enters Overflow Risk and starts a Grace Timer instead
// of ending the game immediately (core/logic.md §3 Node Overflow — two independent
// triggers, one shared Grace Timer). Dropping under capacity AND below the patience
// limit discards the timer; letting it reach zero while either condition still
// holds ends the game — unless a Game-Over Continue is available (an ad offer is
// presented instead, core/monetization.md §3) or Creative Mode is active (the Node
// is relieved automatically instead, core/logic.md §3 Creative Mode) — either way
// the game doesn't end.
export function updateOverflowRisk(state: GameState, dt: number): void {
  for (const station of Object.values(state.stations)) {
    const overCapacity = station.passengerQueue.length >= station.maxCapacity;
    const passengerOverstaying = station.passengerQueue.some(
      p => state.gameTimeMs - p.queuedAtMs >= CONFIG.PASSENGER_PATIENCE_LIMIT_MS,
    );
    const atRisk = overCapacity || passengerOverstaying;

    if (!atRisk) {
      station.riskTimer = null;
      continue;
    }

    if (station.riskTimer === null) {
      station.riskTimer = state.graceDurationMs;
      state.audioEvents.push('overflowRisk');
    } else {
      station.riskTimer -= dt;
      if (station.riskTimer <= 0) {
        if (state.creativeMode) {
          relieveStation(state, station);
          continue;
        }
        // Recorded unconditionally, before the Continue-offer branch — the game
        // over screen (themes/metro.md §8) still needs it if this Continue is
        // later declined (monetization.ts declineAdOffer).
        state.overflowStationShape = station.shape;
        if (canOfferContinue(state)) {
          offerGameOverContinue(state);
        } else {
          state.phase = 'gameover';
          state.audioEvents.push('gameOver');
        }
        return;
      }
    }
  }
}
