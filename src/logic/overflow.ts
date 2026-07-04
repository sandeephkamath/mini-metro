import type { GameState } from '../types/game';

export function checkOverflow(state: GameState): void {
  for (const station of Object.values(state.stations)) {
    if (station.passengerQueue.length > station.maxCapacity) {
      state.phase = 'gameover';
      return;
    }
  }
}
