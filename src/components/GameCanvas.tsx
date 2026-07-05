import { useRef } from 'react';
import type { MilestoneBonusKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { useGameState } from '../hooks/useGameState';
import { useGameLoop } from '../hooks/useGameLoop';
import { useMouseInput } from '../hooks/useMouseInput';
import { resolveMilestoneChoice } from '../logic/milestone';
import { HUD } from './HUD';
import { HomeScreen } from './HomeScreen';
import { StartScreen } from './StartScreen';
import { GameOverScreen } from './GameOverScreen';
import { MilestoneChoiceModal } from './MilestoneChoiceModal';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    stateRef, score, phase, weekNumber, level, weekProgress, reserveCarriers, reserveCarriages, milestoneChoicePending,
    selectedReserveItem, playerPaused, playerSpeedMultiplier,
    startGame, goToStart, goHome, syncReactState, setSelectedReserveItem, setPlayerPaused, setPlayerSpeedMultiplier,
  } = useGameState();

  useGameLoop({ stateRef, canvasRef, syncReactState });
  useMouseInput({ canvasRef, stateRef });

  const state = stateRef.current;
  const milestoneAge = state.lastMilestoneTime > 0
    ? Math.max(0, state.gameTimeMs - state.lastMilestoneTime)
    : 99999;
  const lineSlots = Object.keys(state.lines)
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map(id => ({ color: state.lines[id].color, isUnlocked: state.lines[id].isUnlocked }));
  // Derived, not synced state — cheap to recompute each render and only needs to be
  // as fresh as the ~10Hz syncReactState tick that already drives a re-render here.
  const overflowRiskActive = Object.values(state.stations).some(s => s.riskTimer !== null);

  function selectReserveCarrier() {
    setSelectedReserveItem(selectedReserveItem === 'carrier' ? null : 'carrier');
  }
  function selectReserveCarriage() {
    setSelectedReserveItem(selectedReserveItem === 'carriage' ? null : 'carriage');
  }
  function chooseMilestoneBonus(kind: MilestoneBonusKind) {
    resolveMilestoneChoice(state, kind);
  }

  return (
    <div style={{ position: 'relative', width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        width={CONFIG.CANVAS_WIDTH}
        height={CONFIG.CANVAS_HEIGHT}
        style={{ display: 'block', cursor: 'crosshair' }}
      />

      {phase === 'playing' && (
        <HUD
          score={score}
          weekNumber={weekNumber}
          level={level}
          weekProgress={weekProgress}
          lineSlots={lineSlots}
          milestoneMessage={state.lastMilestoneMessage}
          milestoneAge={milestoneAge}
          reserveCarriers={reserveCarriers}
          reserveCarriages={reserveCarriages}
          selectedReserveItem={selectedReserveItem}
          onSelectReserveCarrier={selectReserveCarrier}
          onSelectReserveCarriage={selectReserveCarriage}
          overflowRiskActive={overflowRiskActive}
          playerPaused={playerPaused}
          playerSpeedMultiplier={playerSpeedMultiplier}
          onPause={() => setPlayerPaused(true)}
          onPlayNormal={() => setPlayerSpeedMultiplier(1)}
          onFastForward={() => setPlayerSpeedMultiplier(2)}
        />
      )}

      {phase === 'playing' && milestoneChoicePending && (
        <MilestoneChoiceModal level={level} onChoose={chooseMilestoneBonus} />
      )}

      {phase === 'home' && <HomeScreen onPlay={goToStart} />}

      {phase === 'start' && <StartScreen onStart={startGame} />}

      {phase === 'gameover' && (
        <GameOverScreen score={score} level={level} onRestart={goHome} />
      )}
    </div>
  );
}
