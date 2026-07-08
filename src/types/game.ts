export type StationShape = 'circle' | 'triangle' | 'square' | 'star' | 'hexagon' | 'plus';
export type TrainState = 'moving' | 'stopped';
export type TrainDirection = 1 | -1;
export type GamePhase = 'home' | 'start' | 'playing' | 'gameover';
export type MilestoneBonusMode = 'auto' | 'choice';
export type MilestoneBonusKind = 'carrier' | 'carriage';
export type ReserveItemKind = 'carrier' | 'carriage';

// Ad-gated monetization (core/monetization.md §1-3). 'onDemand' is the player-triggered
// mid-session bonus request; 'continue' is the Game-Over rescue offered when a Node's
// Grace Timer expires. Both share the same offer -> ad -> bonus-choice flow.
export type AdFlowKind = 'onDemand' | 'continue';
export type AdFlowStage = 'confirm' | 'playing' | 'choice';
export interface AdFlowState {
  kind: AdFlowKind;
  stage: AdFlowStage;
}

// Scripted tutorial steps in order (specs/TUTORIAL.md §5). "Wait" steps run the
// clock until a game event fires; the rest hold the clock while a card is shown.
export type TutorialStepId =
  | 'welcome'
  | 'firstLine'
  | 'train'
  | 'passenger'
  | 'boardingWait'
  | 'boardingCard'
  | 'deliveryWait'
  | 'deliveryCard'
  | 'overflowDemo'
  | 'overflowCard'
  | 'rescueAct'
  | 'rescueWait'
  | 'averted'
  | 'wrapup';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Passenger {
  id: string;
  destinationShape: StationShape;
  originStationId: string;
  queuedAtMs: number; // state.gameTimeMs when last added to a Station queue (spawn/transfer/debug) — drives the queue-in animation; stale while riding a Train
}

// Short-lived ghost flourish left when a Passenger boards a Train or is delivered —
// pruned from GameState.passengerFx once older than the flourish duration.
export interface PassengerFx {
  stationId: string;
  shape: StationShape;
  kind: 'board' | 'deliver';
  atMs: number; // state.gameTimeMs when the event happened
}

export interface Station {
  id: string;
  label: string; // e.g. C1, T2, S3
  shape: StationShape;
  pos: Vec2;
  passengerQueue: Passenger[];
  maxCapacity: number;
  lineIds: string[];
  riskTimer: number | null; // ms remaining before overflow ends the game; null = not at risk
  spawnedAtMs: number; // state.gameTimeMs at creation — drives the spawn-in animation, freezes with the Game Clock
}

export interface MetroLine {
  id: string;
  color: string;
  stationIds: string[];
  trainIds: string[];
  isUnlocked: boolean;
  elbows: (Vec2 | null)[]; // one per segment (stationIds.length - 1); chosen at segment creation, frozen after (themes/metro.md §7 item 3)
}

export interface Train {
  id: string;
  lineId: string;
  passengers: Passenger[];
  maxCapacity: number;
  carriageCount: number; // 1 = base train only; each Depot Carriage attached adds one
  pos: Vec2;
  targetStationIndex: number;
  direction: TrainDirection;
  progress: number;
  state: TrainState;
  stopTimer: number;
  spawnedAtMs: number; // state.gameTimeMs at creation — drives the spawn-in animation, freezes with the Game Clock
}

export interface DrawingState {
  isDrawing: boolean;
  lineId: string | null;
  startStationId: string | null;
  insertAfterIndex: number | null; // set when dragging from a mid-line segment to insert a station
  grabPos: Vec2 | null; // segment grab point, for drag preview when insertAfterIndex is set
  mousePos: Vec2;
  // Provisional chain built up during the drag (core §4) — committed only on release.
  // New-line drags: path[0] is the start station. Extend drags: path holds only the
  // stations chained beyond the line's dragged end.
  path: string[];
  detachCount: number; // terminal stations provisionally marked for removal (shorten gesture)
  extendEnd: 'front' | 'back' | null; // which end of lineId is being extended; null = new line / insertion
}

export interface CameraState {
  x: number; // world x at the center of the viewport
  y: number; // world y at the center of the viewport
  zoom: number; // 1 = 1 world px per screen px
  autoFit: boolean; // true until the player manually zooms or pans, then permanently false
  isPanning: boolean;
  panLastScreen: Vec2 | null;
}

export interface ViewportSize {
  width: number;
  height: number;
}

// Active tutorial session (specs/TUTORIAL.md). The three fixed starting stations
// are resolved once at start so every scripted step targets stable ids.
export interface TutorialState {
  step: TutorialStepId;
  circleId: string;
  triangleId: string;
  squareId: string;
  passengerId: string | null; // the scripted boarding/delivery passenger (steps 4-6)
  demoTimer: number; // ms remaining in the overflow demo run (step 7.2)
  prevPauseStations: boolean; // debug spawn toggles restored on exit (TUTORIAL.md §6)
  prevPausePassengers: boolean;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  gameTimeMs: number;
  weekNumber: number;
  level: number; // count of Milestone Events fired this session — see meta_progression.md §1
  nextStationSpawnTime: number;
  nextPassengerSpawnTime: number;
  nextWeekTime: number;
  nextMilestoneTime: number;
  stations: Record<string, Station>;
  lines: Record<string, MetroLine>;
  trains: Record<string, Train>;
  passengerFx: PassengerFx[]; // time-ordered; pruned each tick once older than the flourish duration
  drawing: DrawingState;
  camera: CameraState;
  // Real on-screen canvas size (post-rotation-alignment). Equals CONFIG.CANVAS_WIDTH/HEIGHT
  // whenever the real viewport is at least that big in both dimensions; otherwise sized
  // dynamically to the real viewport (GameCanvas.tsx recompute(), themes/metro.md §6.1).
  viewport: ViewportSize;
  lastMilestoneMessage: string;
  lastMilestoneTime: number;
  graceDurationMs: number; // Grace Duration — fixed for the whole session (core/monetization.md removed the old "grace" bonus kind that used to grow it)
  reserveCarriers: number; // unplaced Depot Trains
  reserveCarriages: number; // unplaced Depot Carriages
  milestoneBonusMode: MilestoneBonusMode;
  milestoneAutoIndex: number; // round-robin cursor for Auto mode
  milestoneChoicePending: boolean; // true while the Weekly Upgrade choice popup is open (freezes all timers)
  selectedReserveItem: ReserveItemKind | null; // player has clicked a Depot item and is now picking a target
  continuesRemaining: number; // Game-Over Continues left this session (core/monetization.md §5) — resets every session
  adFlow: AdFlowState | null; // On-Demand Bonus Request / Game-Over Continue flow (core/monetization.md §1-3)
  debugAdForcedUnavailable: boolean; // DEBUG.md § Debug Ad Availability
  // ID counters live in state — never in module scope, to avoid re-render side-effects
  nextIds: { station: number; passenger: number; train: number };
  playerPaused: boolean; // player-facing pause (Pause button) — independent of Milestone-choice pausing
  playerSpeedMultiplier: 1 | 2; // player-facing Play/Fast-Forward toggle; ignored while debugMode overrides speed
  debugMode: boolean;
  debugSpeed: number; // 0=pause, 1=1x, 2=2x, 4=4x
  debugLog: string[]; // circular, capped at 30 entries
  debugAction: null
    | { type: 'pick_passenger'; stationId: string; menuPos: Vec2 }
    | { type: 'pick_station_shape'; menuPos: Vec2; worldPos: Vec2 };
  debugPlacingStation: boolean; // true after pressing A, waiting for canvas click
  debugPauseStations: boolean; // suppress automatic station spawning
  debugPausePassengers: boolean; // suppress automatic passenger spawning
  tutorial: TutorialState | null; // active scripted tutorial, debug-triggered (specs/TUTORIAL.md)
}
