import { useRef } from 'react';
import { CONFIG } from '../config/gameConfig';
import { useGameState } from '../hooks/useGameState';
import { useGameLoop } from '../hooks/useGameLoop';
import { useMouseInput } from '../hooks/useMouseInput';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { GameOverScreen } from './GameOverScreen';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stateRef, score, phase, weekNumber, startGame, syncReactState } = useGameState();

  useGameLoop({ stateRef, canvasRef, syncReactState });
  useMouseInput({ canvasRef, stateRef });

  const state = stateRef.current;
  const deliveryAge = state.lastDeliveryTime > 0
    ? Math.max(0, state.gameTimeMs - state.lastDeliveryTime)
    : 99999;

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
          deliveryMessage={state.lastDeliveryMessage}
          deliveryAge={deliveryAge}
        />
      )}

      {phase === 'start' && <StartScreen onStart={startGame} />}

      {phase === 'gameover' && (
        <GameOverScreen score={score} weekNumber={weekNumber} onRestart={startGame} />
      )}
    </div>
  );
}
