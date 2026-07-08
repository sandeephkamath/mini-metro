import type { GameState, MilestoneBonusKind } from '../types/game';
import { grantReserveBonus } from './milestone';

// Ad-gated monetization (core/monetization.md). Both the On-Demand Bonus Request
// and the Game-Over Continue share the same confirm -> ad -> bonus-choice flow
// (state.adFlow); only what happens once the bonus is picked differs (§3's
// station-rescue step, continue-only).

// The Ad Provider is a Simulated Ad stand-in until a real SDK is integrated
// (§4) — always available except when the debug toggle forces it off (DEBUG.md
// § Debug Ad Availability).
export function isAdAvailable(state: GameState): boolean {
  return !state.debugAdForcedUnavailable;
}

export function canOfferContinue(state: GameState): boolean {
  return state.continuesRemaining > 0 && isAdAvailable(state);
}

// Player-triggered at any time during play (§2) — a no-op if unavailable, another
// modal is already up, or a flow is already in progress.
export function requestOnDemandBonus(state: GameState): void {
  if (state.phase !== 'playing' || state.adFlow || state.milestoneChoicePending || !isAdAvailable(state)) return;
  state.adFlow = { kind: 'onDemand', stage: 'confirm' };
}

// Called by overflow.ts when a Node's Grace Timer expires and canOfferContinue() is
// true, in place of ending the game immediately (§3).
export function offerGameOverContinue(state: GameState): void {
  state.adFlow = { kind: 'continue', stage: 'confirm' };
}

export function acceptAdOffer(state: GameState): void {
  if (!state.adFlow) return;
  state.adFlow = { ...state.adFlow, stage: 'playing' };
}

// Declined (or closed) the confirm prompt (§1 "Declined") — the moment that triggered
// the offer is left exactly as if it had never been made, except a declined Continue
// still lets Node Overflow end the game (core/logic.md §3 Expiry proceeds normally).
export function declineAdOffer(state: GameState): void {
  if (!state.adFlow) return;
  const wasContinue = state.adFlow.kind === 'continue';
  state.adFlow = null;
  if (wasContinue) state.phase = 'gameover';
}

// The Simulated (or real) ad finished playing successfully — advance to the
// bonus-kind choice, the shared final step of both paths (§1 "Completed").
export function completeAdPlayback(state: GameState): void {
  if (!state.adFlow) return;
  state.adFlow = { ...state.adFlow, stage: 'choice' };
}

// Player picked New Train or New Carriage after a completed ad. For a Continue, this
// also relieves every at-risk Node and consumes one Continue (§3); an On-Demand
// bonus just grants the Reserve item (§2).
export function resolveAdBonusChoice(state: GameState, kind: MilestoneBonusKind): void {
  if (!state.adFlow) return;
  const flowKind = state.adFlow.kind;
  grantReserveBonus(state, kind);

  if (flowKind === 'continue') {
    for (const station of Object.values(state.stations)) {
      if (station.riskTimer !== null) {
        station.passengerQueue.length = Math.min(station.passengerQueue.length, station.maxCapacity - 1);
        station.riskTimer = null;
      }
    }
    state.continuesRemaining -= 1;
  }

  state.adFlow = null;
}
