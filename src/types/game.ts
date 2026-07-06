export type StationShape = 'circle' | 'triangle' | 'square' | 'star' | 'hexagon' | 'plus';
export type TrainState = 'moving' | 'stopped';
export type TrainDirection = 1 | -1;
export type GamePhase = 'home' | 'start' | 'playing' | 'gameover';
export type MilestoneBonusMode = 'auto' | 'choice';
export type MilestoneBonusKind = 'carrier' | 'carriage' | 'grace';
export type ReserveItemKind = 'carrier' | 'carriage';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Passenger {
  id: string;
  destinationShape: StationShape;
  originStationId: string;
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
  drawOrder: number | null; // set once the line first connects 2 stations; null = not yet drawn
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
}

export interface DrawingState {
  isDrawing: boolean;
  lineId: string | null;
  startStationId: string | null;
  insertAfterIndex: number | null; // set when dragging from a mid-line segment to insert a station
  grabPos: Vec2 | null; // segment grab point, for drag preview when insertAfterIndex is set
  mousePos: Vec2;
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
  drawing: DrawingState;
  camera: CameraState;
  // Real on-screen canvas size (post-rotation-alignment). Equals CONFIG.CANVAS_WIDTH/HEIGHT
  // whenever the real viewport is at least that big in both dimensions; otherwise sized
  // dynamically to the real viewport (GameCanvas.tsx recompute(), themes/metro.md §6.1).
  viewport: ViewportSize;
  lastMilestoneMessage: string;
  lastMilestoneTime: number;
  graceDurationMs: number; // current Grace Duration — grows via "grace" bonuses, never shrinks
  reserveCarriers: number; // unplaced Depot Trains
  reserveCarriages: number; // unplaced Depot Carriages
  milestoneBonusMode: MilestoneBonusMode;
  milestoneAutoIndex: number; // round-robin cursor for Auto mode
  milestoneChoicePending: boolean; // true while the Weekly Upgrade choice popup is open (freezes all timers)
  selectedReserveItem: ReserveItemKind | null; // player has clicked a Depot item and is now picking a target
  // ID counters live in state — never in module scope, to avoid re-render side-effects
  nextIds: { station: number; passenger: number; train: number; lineDraw: number };
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
}
