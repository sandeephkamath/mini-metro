import { useEffect, useRef, useState } from 'react';
import type { MilestoneBonusKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { useGameState } from '../hooks/useGameState';
import { useGameLoop } from '../hooks/useGameLoop';
import { useMouseInput } from '../hooks/useMouseInput';
import { resolveMilestoneChoice } from '../logic/milestone';
import { removeLine } from '../logic/lines';
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

  // Rotation state is read by useMouseInput.ts's coordinate math (a ref, not just
  // React state — the native touch/mouse listeners need the current value
  // synchronously without re-attaching on every resize). See themes/metro.md §6.1.
  const rotatedRef = useRef(false);
  useMouseInput({ canvasRef, stateRef, rotatedRef });

  // Scale the whole fixed 800x600 design (canvas + HUD, all pixel-based) to fit any
  // viewport via a single CSS transform, rather than reworking every component's
  // units. Never scales UP past 1, so desktop (and the Playwright harness's larger
  // default viewport) renders pixel-identical to before this existed.
  //
  // On a portrait-shaped viewport (taller than wide — the common phone case, since
  // this design is landscape-shaped), a plain contain-fit is limited by the narrow
  // width and leaves most of the screen empty. Rotating the whole stage 90° first —
  // aligning its long axis with the viewport's long axis — fills far more of the
  // screen (themes/metro.md §6.1). getBoundingClientRect reflects the rotation, but
  // the screen-to-canvas-local mapping stops being a simple per-axis scale once
  // rotated, so useMouseInput.ts's getCanvasPos needs to know when it's active —
  // that's what rotatedRef is for.
  const [stageScale, setStageScale] = useState(1);
  const [rotated, setRotated] = useState(false);
  useEffect(() => {
    function recompute() {
      const portrait = window.innerHeight > window.innerWidth;
      const scale = portrait
        ? Math.min(1, window.innerHeight / CONFIG.CANVAS_WIDTH, window.innerWidth / CONFIG.CANVAS_HEIGHT)
        : Math.min(1, window.innerWidth / CONFIG.CANVAS_WIDTH, window.innerHeight / CONFIG.CANVAS_HEIGHT);
      rotatedRef.current = portrait;
      setRotated(portrait);
      setStageScale(scale);
    }
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, []);

  const state = stateRef.current;
  const milestoneAge = state.lastMilestoneTime > 0
    ? Math.max(0, state.gameTimeMs - state.lastMilestoneTime)
    : 99999;
  const lineSlots = Object.keys(state.lines)
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map(id => ({
      id,
      color: state.lines[id].color,
      isUnlocked: state.lines[id].isUnlocked,
      hasStations: state.lines[id].stationIds.length > 0,
    }));
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
  function deleteLine(lineId: string) {
    removeLine(state, lineId);
  }

  // Outer box is sized to the actual on-screen footprint (rotated: width/height
  // swapped, since the visual bounding box of a 90°-rotated 800x600 box is 600x800
  // before scaling) so the parent's flex-centering (App.tsx) still centers it exactly.
  // Inner "design" div stays a fixed 800x600 and is centered within the outer box via
  // top/left 50% + translate(-50%,-50%) on its own size, so the same transform-origin
  // (its own center) works whether or not rotate(90deg) is also applied — rotating
  // and scaling both happen around that already-centered point.
  const outerWidth = (rotated ? CONFIG.CANVAS_HEIGHT : CONFIG.CANVAS_WIDTH) * stageScale;
  const outerHeight = (rotated ? CONFIG.CANVAS_WIDTH : CONFIG.CANVAS_HEIGHT) * stageScale;

  return (
    <div style={{
      width: outerWidth,
      height: outerHeight,
      position: 'relative',
      overflow: 'hidden',
    }}>
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: CONFIG.CANVAS_WIDTH,
      height: CONFIG.CANVAS_HEIGHT,
      transform: `translate(-50%, -50%) ${rotated ? 'rotate(90deg) ' : ''}scale(${stageScale})`,
    }}>
      <canvas
        ref={canvasRef}
        width={CONFIG.CANVAS_WIDTH}
        height={CONFIG.CANVAS_HEIGHT}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
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
          onDeleteLine={deleteLine}
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
    </div>
  );
}
