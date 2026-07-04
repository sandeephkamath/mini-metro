import type { GameState } from '../types/game';
import { unlockNextLine, addTrainToLine, addCarriageToTrain } from './lines';

export function processDelivery(state: GameState): void {
  const messages: string[] = [];

  // Add a train to the active line with fewest trains
  const activeLines = Object.values(state.lines)
    .filter(l => l.isUnlocked && l.stationIds.length >= 2);

  if (activeLines.length > 0) {
    const target = activeLines.reduce((a, b) => a.trainIds.length <= b.trainIds.length ? a : b);
    addTrainToLine(state, target.id);
    messages.push('New train added');
  }

  // Unlock the next locked line
  if (unlockNextLine(state)) {
    messages.push('New line unlocked');
  }

  // Give +2 capacity to the busiest train
  const allTrains = Object.values(state.trains);
  if (allTrains.length > 0) {
    const busiest = allTrains.reduce((a, b) =>
      a.passengers.length >= b.passengers.length ? a : b
    );
    addCarriageToTrain(state, busiest.id);
    messages.push('+2 capacity on busiest train');
  }

  state.lastDeliveryMessage = messages.join(' · ') || 'Resources delivered';
  state.lastDeliveryTime = state.gameTimeMs;
}
