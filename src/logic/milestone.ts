import type { GameState, MilestoneBonusKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';

const AUTO_ORDER: MilestoneBonusKind[] = ['carrier', 'carriage', 'grace'];

function grantBonus(state: GameState, kind: MilestoneBonusKind): string {
  if (kind === 'carrier') {
    state.reserveCarriers += 1;
    return 'New Train added to the Depot';
  }
  if (kind === 'carriage') {
    state.reserveCarriages += 1;
    return 'New Carriage added to the Depot';
  }

  state.graceDurationMs += CONFIG.RISK_TIMER_INCREMENT_MS;
  for (const station of Object.values(state.stations)) {
    if (station.riskTimer !== null) station.riskTimer += CONFIG.RISK_TIMER_INCREMENT_MS;
  }
  return `+${CONFIG.RISK_TIMER_INCREMENT_MS / 1000}s Risk Timer for every station`;
}

function announce(state: GameState, msg: string): void {
  state.lastMilestoneMessage = `Level ${state.level}! ${msg}`;
  state.lastMilestoneTime = state.gameTimeMs;
}

// Fires a Milestone Event. In Auto mode the bonus is picked and granted immediately.
// In Choice mode this only opens the choice popup — resolveMilestoneChoice grants it.
export function fireMilestoneEvent(state: GameState): void {
  if (state.milestoneBonusMode === 'auto') {
    const kind = AUTO_ORDER[state.milestoneAutoIndex % AUTO_ORDER.length];
    state.milestoneAutoIndex += 1;
    announce(state, grantBonus(state, kind));
  } else {
    state.milestoneChoicePending = true;
  }
}

// Called when the player picks one of the three options in the Choice mode popup.
export function resolveMilestoneChoice(state: GameState, kind: MilestoneBonusKind): void {
  if (!state.milestoneChoicePending) return;
  announce(state, grantBonus(state, kind));
  state.milestoneChoicePending = false;
}
