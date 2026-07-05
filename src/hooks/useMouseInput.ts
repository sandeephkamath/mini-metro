import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '../types/game';
import { onMouseDown, onMouseMove, onMouseUp, onWheel } from '../input/mouseHandler';

interface UseMouseInputOptions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<GameState>;
}

export function useMouseInput({ canvasRef, stateRef }: UseMouseInputOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      const scaleY = canvas!.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    const handleDown = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      onMouseDown(stateRef.current, x, y);
    };

    const handleMove = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      onMouseMove(stateRef.current, x, y);
    };

    const handleUp = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      onMouseUp(stateRef.current, x, y);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = getCanvasPos(e);
      onWheel(stateRef.current, x, y, e.deltaY);
    };

    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'Escape' && s.selectedReserveItem) {
        s.selectedReserveItem = null;
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        s.debugMode = !s.debugMode;
        if (!s.debugMode) {
          s.debugLog = [];
          s.debugSpeed = 1;
          s.debugAction = null;
          s.debugPlacingStation = false;
          s.debugPauseStations = false;
          s.debugPausePassengers = false;
        }
        return;
      }
      if (!s.debugMode) return;
      if (e.key === '0') s.debugSpeed = 0;
      else if (e.key === '1') s.debugSpeed = 1;
      else if (e.key === '2') s.debugSpeed = 2;
      else if (e.key === '3') s.debugSpeed = 4;
      else if (e.key === 's' || e.key === 'S') s.debugPauseStations = !s.debugPauseStations;
      else if (e.key === 'p' || e.key === 'P') s.debugPausePassengers = !s.debugPausePassengers;
      else if (e.key === 'a' || e.key === 'A') {
        s.debugAction = null;
        s.debugPlacingStation = !s.debugPlacingStation;
      } else if (e.key === 'Escape') {
        s.debugAction = null;
        s.debugPlacingStation = false;
      }
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('keydown', handleKey);

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('keydown', handleKey);
    };
  }, [canvasRef, stateRef]);
}
