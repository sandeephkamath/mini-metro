import type { GameState, Station } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// Cuts a Station's queue back to a safe fraction of capacity — well below either
// overflow trigger, not just one-under (metro.md §11 B21) — and resets the wait
// clock on every Resource still queued there, so one that was about to breach the
// Patience Limit doesn't immediately re-arm the same Grace Timer it just escaped.
// Shared by a completed Game-Over Continue (monetization.ts) and Creative Mode's
// automatic per-Node relief (overflow.ts, core/logic.md §3 Creative Mode) — same
// relief, different trigger. Its own file so neither of those two modules has to
// import the other.
export function relieveStation(state: GameState, station: Station): void {
  const safeCount = Math.floor(station.maxCapacity * CONFIG.CONTINUE_RELIEF_FRACTION);
  station.passengerQueue.length = Math.min(station.passengerQueue.length, safeCount);
  for (const p of station.passengerQueue) p.queuedAtMs = state.gameTimeMs;
  station.riskTimer = null;
}
