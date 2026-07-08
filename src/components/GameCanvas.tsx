import { useEffect, useRef, useState } from 'react';
import type { MilestoneBonusKind, ViewportSize } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { useGameState } from '../hooks/useGameState';
import { useGameLoop } from '../hooks/useGameLoop';
import { useMouseInput } from '../hooks/useMouseInput';
import { useLeaderboard, type LeaderboardResult } from '../hooks/useLeaderboard';
import { resolveMilestoneChoice } from '../logic/milestone';
import { removeLine } from '../logic/lines';
import { advanceTutorial, exitTutorial } from '../logic/tutorial';
import { HUD } from './HUD';
import { TutorialCard } from './TutorialCard';
import { HomeScreen } from './HomeScreen';
import { GameOverScreen } from './GameOverScreen';
import { BonusChoiceModal } from './BonusChoiceModal';
import { AdConfirmModal } from './AdConfirmModal';
import { SimulatedAdModal } from './SimulatedAdModal';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    stateRef, score, phase, weekNumber, level, weekProgress, reserveCarriers, reserveCarriages, milestoneChoicePending,
    selectedReserveItem, playerPaused, playerSpeedMultiplier, tutorialStep, metaProgression, pictureRevealSegments, isNewBest,
    finalWeeksSurvived, adFlow, adAvailable,
    startGame, goHome, syncReactState, setSelectedReserveItem, setPlayerPaused, setPlayerSpeedMultiplier,
    requestOnDemandBonus, acceptAdOffer, declineAdOffer, completeAdPlayback, resolveAdBonusChoice,
  } = useGameState();

  useGameLoop({ stateRef, canvasRef, syncReactState });

  const leaderboard = useLeaderboard();

  // Rotation state is read by useMouseInput.ts's coordinate math (a ref, not just
  // React state — the native touch/mouse listeners need the current value
  // synchronously without re-attaching on every resize). See themes/metro.md §6.1.
  const rotatedRef = useRef(false);
  useMouseInput({ canvasRef, stateRef, rotatedRef, onDebugLeaderboardSignIn: leaderboard.signIn });

  // Submits this session's score and resolves its rank the moment the game ends
  // (core/meta_progression.md §7 — "the same moment Best Weeks Survived is
  // evaluated locally"), exactly once per session.
  const [leaderboardResult, setLeaderboardResult] = useState<LeaderboardResult | null>(null);
  const leaderboardSubmittedRef = useRef(false);
  useEffect(() => {
    if (phase === 'gameover' && leaderboard.available && !leaderboardSubmittedRef.current) {
      leaderboardSubmittedRef.current = true;
      leaderboard.submitAndFetchRank(finalWeeksSurvived).then(setLeaderboardResult);
    }
  }, [phase, leaderboard, finalWeeksSurvived]);

  // The design (canvas + HUD, all pixel-based) renders at its native 800x600 size
  // whenever the real viewport is at least that big in both dimensions (typical
  // desktop, and the Playwright harness's larger default viewport) — pixel-identical
  // to before this existed. Below that, instead of scaling the native design down to
  // fit (which letterboxes whenever the device's aspect ratio isn't exactly 4:3), the
  // canvas is resized to exactly match the real viewport, so there's never any empty
  // space (themes/metro.md §6.1).
  //
  // On a portrait-shaped viewport (taller than wide — the common phone case, since
  // this design is landscape-shaped), the whole stage still rotates 90° first —
  // aligning its long axis with the viewport's long axis — before sizing. getBoundingClientRect
  // reflects the rotation, but the screen-to-canvas-local mapping stops being a simple
  // identity map once rotated, so useMouseInput.ts's getCanvasPos needs to know when
  // it's active — that's what rotatedRef is for.
  const [viewport, setViewport] = useState<ViewportSize>({ width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT });
  const [rotated, setRotated] = useState(false);
  // Mirrors state.viewport outside the GameState object itself, so it survives
  // startGame()/goHome() replacing stateRef.current wholesale with a fresh
  // createInitialState() (which otherwise resets state.viewport back to the native
  // 800x600 default until the next real resize/orientation event, silently breaking
  // the camera on a small viewport until the player rotates or resizes their device).
  const viewportRef = useRef<ViewportSize>({ width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT });

  useEffect(() => {
    function recompute() {
      // Some mobile browsers (e.g. Chrome's "Desktop site" mode, which some
      // large-screen Android phones enable automatically) report an inflated
      // layout viewport and zoom the whole page out to fit the real screen —
      // innerWidth/innerHeight can then claim desktop-sized dimensions on a
      // screen that's still phone-sized. window.screen tracks the physical
      // display and isn't affected by that zoom, so it's used as a ceiling.
      const winW = Math.min(window.innerWidth, window.screen.width);
      const winH = Math.min(window.innerHeight, window.screen.height);
      const portrait = winH > winW;

      // Realign the real viewport onto the design's own axes: presentedW pairs with
      // CANVAS_WIDTH (the design's horizontal/long axis), presentedH with CANVAS_HEIGHT.
      const presentedW = portrait ? winH : winW;
      const presentedH = portrait ? winW : winH;
      const bigEnough = presentedW >= CONFIG.CANVAS_WIDTH && presentedH >= CONFIG.CANVAS_HEIGHT;
      const nextViewport = bigEnough
        ? { width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT }
        : { width: Math.floor(presentedW), height: Math.floor(presentedH) };

      rotatedRef.current = portrait;
      viewportRef.current = nextViewport;
      setRotated(portrait);
      setViewport(nextViewport);
      stateRef.current.viewport.width = nextViewport.width;
      stateRef.current.viewport.height = nextViewport.height;
    }
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, [stateRef]);

  // startGame()/goHome() both replace stateRef.current with a fresh createInitialState()
  // (native-size default viewport) — re-apply the real, currently-known viewport
  // immediately afterward so the camera doesn't misbehave until the next resize/rotate.
  function handleStartGame() {
    startGame();
    stateRef.current.viewport.width = viewportRef.current.width;
    stateRef.current.viewport.height = viewportRef.current.height;
    leaderboardSubmittedRef.current = false;
    setLeaderboardResult(null);
  }
  function handleGoHome() {
    goHome();
    stateRef.current.viewport.width = viewportRef.current.width;
    stateRef.current.viewport.height = viewportRef.current.height;
    leaderboardSubmittedRef.current = false;
    setLeaderboardResult(null);
  }

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

  // The tutorial owns the clock and the board's shape while active — the HUD's
  // speed controls, depot placement, and line deletion are suspended so a stray
  // click can't derail a scripted step (specs/TUTORIAL.md §3).
  const tutorialActive = tutorialStep !== null;

  function selectReserveCarrier() {
    if (tutorialActive) return;
    setSelectedReserveItem(selectedReserveItem === 'carrier' ? null : 'carrier');
  }
  function selectReserveCarriage() {
    if (tutorialActive) return;
    setSelectedReserveItem(selectedReserveItem === 'carriage' ? null : 'carriage');
  }
  function chooseMilestoneBonus(kind: MilestoneBonusKind) {
    resolveMilestoneChoice(state, kind);
  }
  function deleteLine(lineId: string) {
    if (tutorialActive) return;
    removeLine(state, lineId);
  }
  // syncReactState right after mutating so the card swaps instantly instead of
  // waiting out the ~10Hz sync tick.
  function tutorialNext() {
    advanceTutorial(state);
    syncReactState();
  }
  function tutorialSkip() {
    exitTutorial(state);
    syncReactState();
  }

  // Outer box is sized to the actual on-screen footprint (rotated: width/height
  // swapped, since the visual bounding box of a 90°-rotated box is its width/height
  // swapped) so the parent's flex-centering (App.tsx) still centers it exactly.
  // Inner "design" div matches viewport's own (pre-rotation) dimensions and is centered
  // within the outer box via top/left 50% + translate(-50%,-50%) on its own size, so the
  // same transform-origin (its own center) works whether or not rotate(90deg) is applied.
  const outerWidth = rotated ? viewport.height : viewport.width;
  const outerHeight = rotated ? viewport.width : viewport.height;

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
      width: viewport.width,
      height: viewport.height,
      transform: `translate(-50%, -50%)${rotated ? ' rotate(90deg)' : ''}`,
    }}>
      <canvas
        ref={canvasRef}
        width={viewport.width}
        height={viewport.height}
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
          onPause={() => { if (!tutorialActive) setPlayerPaused(true); }}
          onPlayNormal={() => { if (!tutorialActive) setPlayerSpeedMultiplier(1); }}
          onFastForward={() => { if (!tutorialActive) setPlayerSpeedMultiplier(2); }}
          onDeleteLine={deleteLine}
          adAvailable={adAvailable}
          onRequestBonus={() => { if (!tutorialActive) requestOnDemandBonus(); }}
        />
      )}

      {phase === 'playing' && tutorialStep && (
        <TutorialCard step={tutorialStep} onNext={tutorialNext} onSkip={tutorialSkip} />
      )}

      {phase === 'playing' && milestoneChoicePending && (
        <BonusChoiceModal title={`Level ${level}!`} subtitle="Pick one upgrade" onChoose={chooseMilestoneBonus} />
      )}

      {adFlow?.stage === 'confirm' && (
        <AdConfirmModal
          message={
            adFlow.kind === 'onDemand'
              ? 'Watch an ad to get a free Train or Carriage?'
              : 'Station Overflow! Watch an ad to continue?'
          }
          onAccept={acceptAdOffer}
          onDecline={declineAdOffer}
        />
      )}

      {adFlow?.stage === 'playing' && <SimulatedAdModal onComplete={completeAdPlayback} />}

      {adFlow?.stage === 'choice' && (
        <BonusChoiceModal title="Choose your reward" subtitle="Pick one" onChoose={resolveAdBonusChoice} />
      )}

      {phase === 'home' && (
        <HomeScreen
          onPlay={handleStartGame}
          bestWeeksSurvived={metaProgression.bestWeeksSurvived}
          collectionSize={metaProgression.collectionSize}
          currentPictureProgress={metaProgression.currentPictureProgress}
          leaderboardIdentity={leaderboard.available ? leaderboard.identity : null}
        />
      )}

      {phase === 'gameover' && (
        <GameOverScreen
          score={score}
          level={level}
          weekNumber={weekNumber}
          bestWeeksSurvived={metaProgression.bestWeeksSurvived}
          isNewBest={isNewBest}
          leaderboardResult={leaderboardResult}
          pictureRevealSegments={pictureRevealSegments}
          onRestart={handleGoHome}
        />
      )}
    </div>
    </div>
  );
}
