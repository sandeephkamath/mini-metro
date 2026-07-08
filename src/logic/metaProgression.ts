import type { GameState } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// 0..1 fraction of the current week elapsed — shared by the HUD clock and
// Weeks Survived (core/meta_progression.md §1) so both read the same value.
export function getWeekProgress(state: GameState): number {
  return Math.max(0, Math.min(0.9999, 1 - (state.nextWeekTime - state.gameTimeMs) / CONFIG.WEEK_DURATION_MS));
}

// Whole week number plus fractional day-of-week progress (metro.md §9.1).
// Frozen the instant phase leaves 'playing', since gameLoop's tick() stops
// advancing gameTimeMs/weekNumber at that point — safe to read any time after.
export function getWeeksSurvived(state: GameState): number {
  return state.weekNumber + getWeekProgress(state);
}
