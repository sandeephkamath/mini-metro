import type { GameState, MilestoneBonusKind } from '../types/game';

const AUTO_ORDER: MilestoneBonusKind[] = ['carrier', 'carriage'];

// Adds one Reserve item of the given kind to the Depot — shared by the free Milestone
// Event bonus (below) and the ad-gated paths to the same two kinds (core/monetization.md
// §2, §3), which grant identically once their own ad flow completes.
export function grantReserveBonus(state: GameState, kind: MilestoneBonusKind): string {
  if (kind === 'carrier') {
    state.reserveCarriers += 1;
    return 'New Train added to the Depot';
  }
  state.reserveCarriages += 1;
  return 'New Carriage added to the Depot';
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
    announce(state, grantReserveBonus(state, kind));
  } else {
    state.milestoneChoicePending = true;
  }
}

// Called when the player picks one of the two options in the Choice mode popup.
export function resolveMilestoneChoice(state: GameState, kind: MilestoneBonusKind): void {
  if (!state.milestoneChoicePending) return;
  announce(state, grantReserveBonus(state, kind));
  state.milestoneChoicePending = false;
}
