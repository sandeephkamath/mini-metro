import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '../types/game';
import { tick } from '../logic/gameLoop';
import { render } from '../render/renderer';

interface UseGameLoopOptions {
  stateRef: MutableRefObject<GameState>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  syncReactState: () => void;
}

export function useGameLoop({ stateRef, canvasRef, syncReactState }: UseGameLoopOptions) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    function loop(now: number) {
      const dt = lastTimeRef.current === 0 ? 16 : now - lastTimeRef.current;
      lastTimeRef.current = now;

      const state = stateRef.current;

      if (state.phase === 'playing') {
        const speedMult = state.debugMode ? state.debugSpeed : 1;
        tick(state, dt * speedMult);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) render(ctx, state, now);
      }

      if (now - lastSyncRef.current > 100) {
        syncReactState();
        lastSyncRef.current = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stateRef, canvasRef, syncReactState]);
}
