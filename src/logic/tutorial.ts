import type { GameState, StationShape, TutorialStepId, TrainDirection } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { trySpawnStationAt } from './stations';
import { computeTrainPos } from './trains';

// Steps that hold the Game Clock while their card is up (specs/TUTORIAL.md §5).
// The "wait" steps and the overflow demo run the clock so the player watches
// the game act; everything else freezes time via the same mechanism as pause.
// extendLine and newLine also run (not held): each injects a new Station, whose
// spawn-in fade/scale animation is keyed to game time (renderStations.ts) — held
// here it would never progress past its just-spawned, barely-visible first frame.
const CLOCK_HELD_STEPS = new Set<TutorialStepId>([
  'firstLine', 'extendLineCard', 'newLineCard', 'depotPlace', 'depotCarriage',
  'overflowCard', 'rescueAct', 'averted', 'wrapup',
]);

export function tutorialHoldsClock(state: GameState): boolean {
  return state.tutorial !== null && CLOCK_HELD_STEPS.has(state.tutorial.step);
}

// The exact station pair a "draw" step instructs (TUTORIAL.md §3) — any mousedown
// or mid-drag chain touching a station outside this set is ignored during that
// step (src/input/mouseHandler.ts), so an off-script line can never be drawn
// instead of the one being taught.
export function tutorialAllowedStations(state: GameState): Set<string> | null {
  const t = state.tutorial;
  if (!t) return null;
  switch (t.step) {
    case 'firstLine': return new Set([t.circleId, t.triangleId]);
    case 'extendLine': return t.extraStationId ? new Set([t.triangleId, t.extraStationId]) : null;
    case 'newLine': return new Set([t.squareId, t.triangleId]);
    default: return null;
  }
}

// Step 3's forced-extension target (TUTORIAL.md §5 step 3 detail): during the
// extendLine step, any drag touching the triangle or star station always
// extends the existing circle→triangle Line from whichever end triangle sits
// at — never a fresh Line — regardless of whether the player actually grabbed
// the end-tab handle or the station body. Returns null once there's no
// original Line to extend (shouldn't happen mid-tutorial) or no star yet.
export function tutorialExtendLineTarget(state: GameState): { lineId: string; extendEnd: 'front' | 'back' } | null {
  const t = state.tutorial;
  if (!t || t.step !== 'extendLine' || !t.extraStationId) return null;
  const line = Object.values(state.lines).find(l =>
    l.stationIds.includes(t.circleId) && l.stationIds.includes(t.triangleId));
  if (!line) return null;
  return { lineId: line.id, extendEnd: line.stationIds[0] === t.triangleId ? 'front' : 'back' };
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
    step: 'firstLine',
    circleId: findStationByShape(state, 'circle'),
    triangleId: findStationByShape(state, 'triangle'),
    squareId: findStationByShape(state, 'square'),
    passengerId: null,
    extraStationId: null,
    overflowStationId: null,
    demoTimer: 0,
    prevPauseStations: state.debugPauseStations,
    prevPausePassengers: state.debugPausePassengers,
  };
  // Sandbox: nothing spawns during the tutorial except what the script injects.
  state.debugPauseStations = true;
  state.debugPausePassengers = true;
  state.debugAction = null;
  state.debugPlacingStation = false;
  // Settle the circle and triangle Stations' spawn-in animation (same bug class
  // as B30, themes/metro.md §10): on a genuinely fresh game the Tutorial's very
  // first step holds the clock at game time ~0, the same instant these
  // Stations were created — without this, their 600ms fade/scale-in freezes on
  // its first, barely-visible frame for the whole First Line step. Deliberately
  // NOT applied to square: it isn't looked at until step 4, so forcing it
  // fully-formed here would make it appear before the two Stations the script
  // actually opens with. Left alone, square starts its own natural fade-in at
  // the same moment and finishes during step 2 (which runs the clock), well
  // before it's ever highlighted (TUTORIAL.md §5 note).
  for (const id of [state.tutorial.circleId, state.tutorial.triangleId]) {
    const station = state.stations[id];
    if (station) station.spawnedAtMs = state.gameTimeMs - CONFIG.STATION_SPAWN_ANIM_MS;
  }
  // Passenger is introduced in the same card that asks for the first drag
  // (TUTORIAL.md §5 step 1) — no separate Welcome step first, no separate "A
  // Passenger" step after. Settled (not fading in): this step holds the clock,
  // so an animated queue-in would otherwise freeze invisibly on its first frame.
  state.tutorial.passengerId = injectPassenger(state, state.tutorial.circleId, 'triangle', true);
}

// Completion and skip share one exit path (TUTORIAL.md §6): restore the spawn
// toggles, hand the clock back at 1x, keep everything real that happened.
export function exitTutorial(state: GameState): void {
  const t = state.tutorial;
  if (!t) return;
  // Skip safety: leaving mid-overflow must not hand the player an unavoidable
  // game over seconds later.
  const overflowStation = t.overflowStationId ? state.stations[t.overflowStationId] : null;
  if (overflowStation && overflowStation.riskTimer !== null) {
    overflowStation.riskTimer = Math.max(overflowStation.riskTimer, CONFIG.TUTORIAL_RESCUE_WINDOW_MS);
  }
  state.debugPauseStations = t.prevPauseStations;
  state.debugPausePassengers = t.prevPausePassengers;
  state.debugSpeed = 1;
  state.playerPaused = false;
  state.tutorial = null;
}

// `settled` backdates queuedAtMs past the queue-in fade/scale animation window,
// for injections made into a step that holds the clock (CLOCK_HELD_STEPS) —
// otherwise the animation freezes on its barely-visible first frame, since
// gameTimeMs never advances while the card is up (same class of bug as the
// Station spawn-halo freeze newLine already works around).
function injectPassenger(state: GameState, stationId: string, destinationShape: StationShape, settled = false): string {
  const station = state.stations[stationId];
  const id = `p${++state.nextIds.passenger}`;
  station.passengerQueue.push({
    id,
    destinationShape,
    originStationId: station.id,
    queuedAtMs: settled ? state.gameTimeMs - CONFIG.PASSENGER_QUEUE_ANIM_MS : state.gameTimeMs,
  });
  return id;
}

function enterStep(state: GameState, step: TutorialStepId): void {
  const t = state.tutorial!;
  t.step = step;
  if (step === 'rideWait') {
    // A freshly-created train always departs the Line's first Station (see
    // createTrain, trains.ts) without boarding whoever's already waiting there
    // (core §3 gotcha) — normally invisible, but here the scripted Passenger is
    // sitting at the circle Station, so the player would otherwise watch a full
    // round trip before boarding ever happens. Repositioning this one train to
    // start already halfway back toward the circle Station, heading there,
    // means it only needs a half-segment trip to reach it and board.
    const line = Object.values(state.lines).find(l =>
      l.stationIds.includes(t.circleId) && l.stationIds.includes(t.triangleId));
    const train = line ? state.trains[line.trainIds[0]] : null;
    if (line && train) {
      const circleIndex = line.stationIds.indexOf(t.circleId);
      const otherIndex = line.stationIds.indexOf(t.triangleId);
      train.targetStationIndex = circleIndex;
      train.direction = (circleIndex > otherIndex ? 1 : -1) as TrainDirection;
      train.progress = 0.5;
      train.pos = computeTrainPos(train, line, state);
    }
  } else if (step === 'extendLine') {
    // Placed reachable from the triangle Station's Line endpoint, same mechanism
    // as DEBUG.md Add Station (bypasses the unlock gate and spawn-distance rules
    // — TUTORIAL.md §7). This step is only ever entered once (no retry path —
    // mouseHandler.ts forces every drag touching triangle/star into a genuine
    // extension, TUTORIAL.md §5 step 3 detail), so no re-entry guard is needed.
    const triangle = state.stations[t.triangleId];
    t.extraStationId = trySpawnStationAt(
      state,
      { x: triangle.pos.x + 200, y: triangle.pos.y - 40 },
      'star',
    );
  } else if (step === 'depotPlace') {
    // Granted directly, not via a live Weekly Upgrade choice (TUTORIAL.md §9).
    state.reserveCarriers = 1;
  } else if (step === 'depotCarriage') {
    // Granted directly, not via a live Weekly Upgrade choice (TUTORIAL.md §9).
    state.reserveCarriages = 1;
  } else if (step === 'overflowDemo') {
    // A fresh Station is injected here rather than reusing square (as earlier
    // versions did) because square is already connected by step 4's new Line
    // by this point — it can no longer stand in for "a station nobody's
    // connected yet" (TUTORIAL.md §5 step 7 detail). Placed reachable from
    // square, the nearest already-connected Station at this point in the script.
    const square = state.stations[t.squareId];
    t.overflowStationId = trySpawnStationAt(
      state,
      { x: square.pos.x + 160, y: square.pos.y + 40 },
      'hexagon',
    );
    // Fill it to capacity — it enters Overflow Risk on the next running tick,
    // then the demo run lets the player watch the arc shrink.
    const overflow = state.stations[t.overflowStationId!];
    let alternate = 0;
    while (overflow.passengerQueue.length < overflow.maxCapacity) {
      injectPassenger(state, t.overflowStationId!, alternate++ % 2 === 0 ? 'circle' : 'triangle');
    }
    t.demoTimer = CONFIG.TUTORIAL_DEMO_MS;
  }
}

// Next/Done button on a card step.
export function advanceTutorial(state: GameState): void {
  const t = state.tutorial;
  if (!t) return;
  switch (t.step) {
    case 'extendLineCard': enterStep(state, 'newLine'); break;
    case 'newLineCard': enterStep(state, 'depotPlace'); break;
    case 'overflowCard': enterStep(state, 'rescueAct'); break;
    case 'averted': enterStep(state, 'wrapup'); break;
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
      if (connected) enterStep(state, 'rideWait');
      break;
    }
    case 'rideWait':
      // The train appearing, boarding, and delivery used to be three separate
      // paused beats, each with its own card and Next click; all three are
      // folded into rideWait's upfront text now (TUTORIAL.md §5 step 2 note), so
      // this advances straight into extendLine, fully automatically, the instant
      // the scripted Passenger is delivered (gone from every Train and every
      // queue) — no card, no click.
      if (t.passengerId && !passengerInAnyTrain(state, t.passengerId) && !passengerInAnyQueue(state, t.passengerId)) {
        enterStep(state, 'extendLine');
      }
      break;
    case 'extendLine': {
      // mouseHandler.ts forces every drag touching triangle/star into a genuine
      // extension of the original circle→triangle Line (TUTORIAL.md §5 step 3
      // detail) — the outcome is guaranteed, so this just waits for it to land.
      const extra = t.extraStationId ? state.stations[t.extraStationId] : null;
      if (extra && extra.lineIds.length > 0) enterStep(state, 'extendLineCard');
      break;
    }
    case 'newLine': {
      const connected = Object.values(state.lines).some(l =>
        l.stationIds.includes(t.squareId) && l.stationIds.includes(t.triangleId));
      if (connected) enterStep(state, 'newLineCard');
      break;
    }
    case 'depotPlace':
      if (state.reserveCarriers === 0) enterStep(state, 'depotCarriage');
      break;
    case 'depotCarriage':
      if (state.reserveCarriages === 0) enterStep(state, 'overflowDemo');
      break;
    case 'overflowDemo':
      t.demoTimer -= dt;
      if (t.demoTimer <= 0) enterStep(state, 'overflowCard');
      break;
    case 'rescueAct': {
      const overflow = t.overflowStationId ? state.stations[t.overflowStationId] : null;
      if (overflow && overflow.lineIds.length > 0) {
        // Rescue Window (TUTORIAL.md §5 step 7.5): the scripted rescue can't fail
        // on a slow train lap.
        if (overflow.riskTimer !== null) overflow.riskTimer = CONFIG.TUTORIAL_RESCUE_WINDOW_MS;
        enterStep(state, 'rescueWait');
      }
      break;
    }
    case 'rescueWait': {
      const overflow = t.overflowStationId ? state.stations[t.overflowStationId] : null;
      if (!overflow || overflow.riskTimer === null) enterStep(state, 'averted');
      break;
    }
  }
}
