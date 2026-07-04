import { useRef, useState, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState, GamePhase } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { createInitialStations } from '../logic/stations';
import { createInitialLines } from '../logic/lines';

function createInitialState(): GameState {
  const state: GameState = {
    phase: 'start',
    score: 0,
    gameTimeMs: 0,
    weekNumber: 0,
    nextStationSpawnTime: CONFIG.STATION_SPAWN_INTERVAL_MS,
    nextPassengerSpawnTime: CONFIG.BASE_PASSENGER_SPAWN_MS,
    nextWeekTime: CONFIG.WEEK_DURATION_MS,
    stations: {},
    lines: {},
    trains: {},
    drawing: {
      isDrawing: false,
      lineId: null,
      startStationId: null,
      insertAfterIndex: null,
      grabPos: null,
      mousePos: { x: 0, y: 0 },
    },
    lastDeliveryMessage: '',
    lastDeliveryTime: -99999,
    nextIds: { station: 0, passenger: 0, train: 0 },
    debugMode: false,
    debugSpeed: 1,
    debugLog: [],
    debugAction: null,
    debugPlacingStation: false,
    debugPauseStations: false,
    debugPausePassengers: false,
  };

  createInitialLines(state);
  createInitialStations(state);

  return state;
}

export function useGameState() {
  // Lazy initializer — function form ensures createInitialState() runs exactly once
  const stateRef = useRef<GameState | null>(null);
  if (stateRef.current === null) {
    stateRef.current = createInitialState();
  }

  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('start');
  const [weekNumber, setWeekNumber] = useState(0);

  // Stable identity — empty deps because stateRef is a ref and setters are stable
  const syncReactState = useCallback(() => {
    setScore(stateRef.current!.score);
    setPhase(stateRef.current!.phase);
    setWeekNumber(stateRef.current!.weekNumber);
  }, []);

  function startGame() {
    stateRef.current = createInitialState();
    stateRef.current.phase = 'playing';
    setPhase('playing');
    setScore(0);
    setWeekNumber(0);
  }

  return { stateRef: stateRef as MutableRefObject<GameState>, score, phase, weekNumber, startGame, syncReactState };
}
