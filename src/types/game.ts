export type StationShape = 'circle' | 'triangle' | 'square';
export type TrainState = 'moving' | 'stopped';
export type TrainDirection = 1 | -1;
export type GamePhase = 'start' | 'playing' | 'gameover';

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
}

export interface MetroLine {
  id: string;
  color: string;
  stationIds: string[];
  trainIds: string[];
  isUnlocked: boolean;
}

export interface Train {
  id: string;
  lineId: string;
  passengers: Passenger[];
  maxCapacity: number;
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

export interface GameState {
  phase: GamePhase;
  score: number;
  gameTimeMs: number;
  weekNumber: number;
  nextStationSpawnTime: number;
  nextPassengerSpawnTime: number;
  nextWeekTime: number;
  stations: Record<string, Station>;
  lines: Record<string, MetroLine>;
  trains: Record<string, Train>;
  drawing: DrawingState;
  lastDeliveryMessage: string;
  lastDeliveryTime: number;
  // ID counters live in state — never in module scope, to avoid re-render side-effects
  nextIds: { station: number; passenger: number; train: number };
  debugMode: boolean;
  debugSpeed: number; // 0=pause, 1=1x, 2=2x, 4=4x
  debugLog: string[]; // circular, capped at 30 entries
  debugAction: null
    | { type: 'pick_passenger'; stationId: string; menuPos: Vec2 }
    | { type: 'pick_station_shape'; menuPos: Vec2 };
  debugPlacingStation: boolean; // true after pressing A, waiting for canvas click
  debugPauseStations: boolean; // suppress automatic station spawning
  debugPausePassengers: boolean; // suppress automatic passenger spawning
}
