import type { GameState, StationShape, TutorialStepId } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { trySpawnStationAt } from './stations';

// Steps that hold the Game Clock while their card is up (specs/TUTORIAL.md §5).
// The "wait" steps and the overflow demo run the clock so the player watches
// the game act; everything else freezes time via the same mechanism as pause.
// extendLine also runs (not held): it injects a new Station, whose spawn-in
// fade/scale animation is keyed to game time (renderStations.ts) — held here it
// would never progress past its just-spawned, barely-visible first frame.
const CLOCK_HELD_STEPS = new Set<TutorialStepId>([
  'welcome', 'firstLine', 'passenger', 'boardingCard', 'deliveryCard',
  'overflowCard', 'rescueAct', 'averted', 'depotPlace', 'wrapup',
]);

export function tutorialHoldsClock(state: GameState): boolean {
  return state.tutorial !== null && CLOCK_HELD_STEPS.has(state.tutorial.step);
}

// Preconditions per TUTORIAL.md §1: a startable board means no Lines drawn yet
// and no Station already at risk — i.e. the start of a run.
export function canStartTutorial(state: GameState): boolean {
  return state.phase === 'playing'
    && state.tutorial === null
    && Object.values(state.lines).every(l => l.stationIds.length === 0)
    && Object.values(state.stations).every(s => s.riskTimer === null);
}

function findStationByShape(state: GameState, shape: StationShape): string {
  // Insertion order puts the three fixed starting stations first, so this always
  // resolves to the starting circle/triangle/square even if more have spawned.
  return Object.values(state.stations).find(s => s.shape === shape)?.id ?? '';
}

export function startTutorial(state: GameState): void {
  if (!canStartTutorial(state)) return;
  state.tutorial = {
    step: 'welcome',
    circleId: findStationByShape(state, 'circle'),
    triangleId: findStationByShape(state, 'triangle'),
    squareId: findStationByShape(state, 'square'),
    passengerId: null,
    extraStationId: null,
    demoTimer: 0,
    prevPauseStations: state.debugPauseStations,
    prevPausePassengers: state.debugPausePassengers,
  };
  // Sandbox: nothing spawns during the tutorial except what the script injects.
  state.debugPauseStations = true;
  state.debugPausePassengers = true;
  state.debugAction = null;
  state.debugPlacingStation = false;
}

// Completion and skip share one exit path (TUTORIAL.md §6): restore the spawn
// toggles, hand the clock back at 1x, keep everything real that happened.
export function exitTutorial(state: GameState): void {
  const t = state.tutorial;
  if (!t) return;
  // Skip safety: leaving mid-overflow must not hand the player an unavoidable
  // game over seconds later.
  const square = state.stations[t.squareId];
  if (square && square.riskTimer !== null) {
    square.riskTimer = Math.max(square.riskTimer, CONFIG.TUTORIAL_RESCUE_WINDOW_MS);
  }
  state.debugPauseStations = t.prevPauseStations;
  state.debugPausePassengers = t.prevPausePassengers;
  state.debugSpeed = 1;
  state.playerPaused = false;
  state.tutorial = null;
}

function injectPassenger(state: GameState, stationId: string, destinationShape: StationShape): string {
  const station = state.stations[stationId];
  const id = `p${++state.nextIds.passenger}`;
  station.passengerQueue.push({
    id,
    destinationShape,
    originStationId: station.id,
    queuedAtMs: state.gameTimeMs,
  });
  return id;
}

function enterStep(state: GameState, step: TutorialStepId): void {
  const t = state.tutorial!;
  t.step = step;
  if (step === 'passenger') {
    t.passengerId = injectPassenger(state, t.circleId, 'triangle');
  } else if (step === 'extendLine') {
    // Placed reachable from the triangle Station's Line endpoint, same mechanism
    // as DEBUG.md Add Station (bypasses the unlock gate and spawn-distance rules
    // — TUTORIAL.md §7).
    const triangle = state.stations[t.triangleId];
    t.extraStationId = trySpawnStationAt(
      state,
      { x: triangle.pos.x + 200, y: triangle.pos.y - 40 },
      'star',
    );
  } else if (step === 'depotPlace') {
    // Granted directly, not via a live Weekly Upgrade choice (TUTORIAL.md §9).
    state.reserveCarriers = 1;
  } else if (step === 'overflowDemo') {
    // Fill the square station to capacity — it enters Overflow Risk on the next
    // running tick, then the demo run lets the player watch the arc shrink.
    const square = state.stations[t.squareId];
    let alternate = 0;
    while (square.passengerQueue.length < square.maxCapacity) {
      injectPassenger(state, t.squareId, alternate++ % 2 === 0 ? 'circle' : 'triangle');
    }
    t.demoTimer = CONFIG.TUTORIAL_DEMO_MS;
  }
}

// Next/Done button on a card step.
export function advanceTutorial(state: GameState): void {
  const t = state.tutorial;
  if (!t) return;
  switch (t.step) {
    case 'welcome': enterStep(state, 'firstLine'); break;
    case 'train': enterStep(state, 'passenger'); break;
    case 'passenger': enterStep(state, 'boardingWait'); break;
    case 'boardingCard': enterStep(state, 'deliveryWait'); break;
    case 'deliveryCard': enterStep(state, 'extendLine'); break;
    case 'overflowCard': enterStep(state, 'rescueAct'); break;
    case 'averted': enterStep(state, 'depotPlace'); break;
    case 'wrapup': exitTutorial(state); break;
  }
}

function passengerInAnyTrain(state: GameState, passengerId: string): boolean {
  return Object.values(state.trains).some(tr => tr.passengers.some(p => p.id === passengerId));
}

function passengerInAnyQueue(state: GameState, passengerId: string): boolean {
  return Object.values(state.stations).some(s => s.passengerQueue.some(p => p.id === passengerId));
}

// Event-driven step advancement, checked every frame (including while the clock
// is held — the firstLine/rescueAct conditions are met by input, not by ticks).
export function tickTutorial(state: GameState, dt: number): void {
  const t = state.tutorial;
  if (!t) return;

  switch (t.step) {
    case 'firstLine': {
      const connected = Object.values(state.lines).some(l =>
        l.stationIds.includes(t.circleId) && l.stationIds.includes(t.triangleId));
      if (connected) enterStep(state, 'train');
      break;
    }
    case 'boardingWait':
      if (t.passengerId && passengerInAnyTrain(state, t.passengerId)) enterStep(state, 'boardingCard');
      break;
    case 'deliveryWait':
      if (t.passengerId && !passengerInAnyTrain(state, t.passengerId) && !passengerInAnyQueue(state, t.passengerId)) {
        enterStep(state, 'deliveryCard');
      }
      break;
    case 'extendLine': {
      const extra = t.extraStationId ? state.stations[t.extraStationId] : null;
      if (extra && extra.lineIds.length > 0) enterStep(state, 'overflowDemo');
      break;
    }
    case 'overflowDemo':
      t.demoTimer -= dt;
      if (t.demoTimer <= 0) enterStep(state, 'overflowCard');
      break;
    case 'rescueAct': {
      const square = state.stations[t.squareId];
      if (square && square.lineIds.length > 0) {
        // Rescue Window (TUTORIAL.md §5 step 7.5): the scripted rescue can't fail
        // on a slow train lap.
        if (square.riskTimer !== null) square.riskTimer = CONFIG.TUTORIAL_RESCUE_WINDOW_MS;
        enterStep(state, 'rescueWait');
      }
      break;
    }
    case 'rescueWait': {
      const square = state.stations[t.squareId];
      if (!square || square.riskTimer === null) enterStep(state, 'averted');
      break;
    }
    case 'depotPlace':
      if (state.reserveCarriers === 0) enterStep(state, 'wrapup');
      break;
  }
}
