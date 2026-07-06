import { useRef, useState, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState, GamePhase, ReserveItemKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { createInitialStations } from '../logic/stations';
import { createInitialLines } from '../logic/lines';
import { createInitialCamera } from '../logic/camera';

function createInitialState(): GameState {
  const state: GameState = {
    phase: 'home',
    score: 0,
    gameTimeMs: 0,
    weekNumber: 0,
    level: 0,
    nextStationSpawnTime: CONFIG.STATION_SPAWN_INTERVAL_MS,
    nextPassengerSpawnTime: CONFIG.BASE_PASSENGER_SPAWN_MS,
    nextWeekTime: CONFIG.WEEK_DURATION_MS,
    nextMilestoneTime: CONFIG.WEEK_DURATION_MS * CONFIG.MILESTONE_EVENT_WEEKS,
    stations: {},
    lines: {},
    trains: {},
    passengerFx: [],
    drawing: {
      isDrawing: false,
      lineId: null,
      startStationId: null,
      insertAfterIndex: null,
      grabPos: null,
      mousePos: { x: 0, y: 0 },
    },
    camera: createInitialCamera(),
    viewport: { width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT },
    lastMilestoneMessage: '',
    lastMilestoneTime: -99999,
    graceDurationMs: CONFIG.RISK_TIMER_BASE_MS,
    reserveCarriers: 0,
    reserveCarriages: 0,
    milestoneBonusMode: CONFIG.MILESTONE_BONUS_MODE,
    milestoneAutoIndex: 0,
    milestoneChoicePending: false,
    selectedReserveItem: null,
    nextIds: { station: 0, passenger: 0, train: 0, lineDraw: 0 },
    playerPaused: false,
    playerSpeedMultiplier: 1,
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
  const [phase, setPhase] = useState<GamePhase>('home');
  const [weekNumber, setWeekNumber] = useState(0);
  const [level, setLevel] = useState(0);
  const [weekProgress, setWeekProgress] = useState(0); // 0..1 fraction of the current week elapsed, for the HUD clock
  const [reserveCarriers, setReserveCarriers] = useState(0);
  const [reserveCarriages, setReserveCarriages] = useState(0);
  const [milestoneChoicePending, setMilestoneChoicePending] = useState(false);
  const [selectedReserveItem, setSelectedReserveItemState] = useState<ReserveItemKind | null>(null);
  const [playerPaused, setPlayerPausedState] = useState(false);
  const [playerSpeedMultiplier, setPlayerSpeedMultiplierState] = useState<1 | 2>(1);

  // Stable identity — empty deps because stateRef is a ref and setters are stable
  const syncReactState = useCallback(() => {
    const s = stateRef.current!;
    setScore(s.score);
    setPhase(s.phase);
    setWeekNumber(s.weekNumber);
    setLevel(s.level);
    setWeekProgress(Math.max(0, Math.min(0.9999, 1 - (s.nextWeekTime - s.gameTimeMs) / CONFIG.WEEK_DURATION_MS)));
    setReserveCarriers(s.reserveCarriers);
    setReserveCarriages(s.reserveCarriages);
    setMilestoneChoicePending(s.milestoneChoicePending);
    setSelectedReserveItemState(s.selectedReserveItem);
    setPlayerPausedState(s.playerPaused);
    setPlayerSpeedMultiplierState(s.playerSpeedMultiplier);
  }, []);

  // Writes through to both the mutable ref (so game logic/input sees it immediately)
  // and React state (so the HUD re-renders immediately, not just at the next 10Hz sync).
  const setSelectedReserveItem = useCallback((kind: ReserveItemKind | null) => {
    stateRef.current!.selectedReserveItem = kind;
    setSelectedReserveItemState(kind);
  }, []);

  const setPlayerPaused = useCallback((paused: boolean) => {
    stateRef.current!.playerPaused = paused;
    setPlayerPausedState(paused);
  }, []);

  // Picking a speed always resumes if paused — matches the original's 3-way
  // Pause/Play/Fast-Forward toggle rather than a separate pause + speed pair.
  const setPlayerSpeedMultiplier = useCallback((mult: 1 | 2) => {
    stateRef.current!.playerSpeedMultiplier = mult;
    stateRef.current!.playerPaused = false;
    setPlayerPausedState(false);
    setPlayerSpeedMultiplierState(mult);
  }, []);

  function resetReactState() {
    setScore(0);
    setWeekNumber(0);
    setLevel(0);
    setWeekProgress(0);
    setReserveCarriers(0);
    setReserveCarriages(0);
    setMilestoneChoicePending(false);
    setSelectedReserveItemState(null);
    setPlayerPausedState(false);
    setPlayerSpeedMultiplierState(1);
  }

  function startGame() {
    stateRef.current = createInitialState();
    stateRef.current.phase = 'playing';
    setPhase('playing');
    resetReactState();
  }

  function goToStart() {
    stateRef.current!.phase = 'start';
    setPhase('start');
  }

  function goHome() {
    stateRef.current = createInitialState();
    setPhase('home');
    resetReactState();
  }

  return {
    stateRef: stateRef as MutableRefObject<GameState>,
    score, phase, weekNumber, level, weekProgress, reserveCarriers, reserveCarriages, milestoneChoicePending, selectedReserveItem,
    playerPaused, playerSpeedMultiplier,
    startGame, goToStart, goHome, syncReactState, setSelectedReserveItem, setPlayerPaused, setPlayerSpeedMultiplier,
  };
}
