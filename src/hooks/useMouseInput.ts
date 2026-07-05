import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState, Vec2 } from '../types/game';
import { onMouseDown, onMouseMove, onMouseUp, onWheel } from '../input/mouseHandler';
import { zoomAtScreenPoint, panCameraByScreenDelta } from '../logic/camera';

interface UseMouseInputOptions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<GameState>;
}

export function useMouseInput({ canvasRef, stateRef }: UseMouseInputOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(e: { clientX: number; clientY: number }) {
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

    // --- Touch input: a single active touch relays to the same onMouseDown/Move/Up
    // used for mouse (they only ever needed canvas-pixel x/y), so one finger draws
    // Lines / pans the Camera exactly like a mouse drag. Two touches are a pinch
    // gesture handled separately (zoom by distance ratio, pan by midpoint delta),
    // reusing camera.ts's zoomAtScreenPoint/panCameraByScreenDelta directly rather
    // than going through onWheel, which is single-point-only.
    let activeTouchId: number | null = null;
    let pinch: { id1: number; id2: number; lastDist: number; lastMid: Vec2 } | null = null;

    function findTouch(touches: TouchList, id: number): Touch | null {
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === id) return touches[i];
      }
      return null;
    }

    function pinchGeometry(a: Touch, b: Touch) {
      const pa = getCanvasPos(a);
      const pb = getCanvasPos(b);
      return {
        dist: Math.hypot(pa.x - pb.x, pa.y - pb.y),
        mid: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      };
    }

    function endActiveTouchDrag(lastTouch: Touch) {
      if (activeTouchId === null) return;
      const { x, y } = getCanvasPos(lastTouch);
      onMouseUp(stateRef.current, x, y);
      activeTouchId = null;
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length >= 2) {
        if (activeTouchId !== null) endActiveTouchDrag(e.touches[0]);
        const [a, b] = [e.touches[0], e.touches[1]];
        const { dist, mid } = pinchGeometry(a, b);
        pinch = { id1: a.identifier, id2: b.identifier, lastDist: dist, lastMid: mid };
      } else if (e.touches.length === 1 && pinch === null && activeTouchId === null) {
        const touch = e.touches[0];
        activeTouchId = touch.identifier;
        const { x, y } = getCanvasPos(touch);
        onMouseDown(stateRef.current, x, y);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (pinch) {
        const a = findTouch(e.touches, pinch.id1);
        const b = findTouch(e.touches, pinch.id2);
        if (!a || !b) return;
        const { dist, mid } = pinchGeometry(a, b);
        const factor = pinch.lastDist > 0 ? dist / pinch.lastDist : 1;
        zoomAtScreenPoint(stateRef.current, mid, factor);
        // Same dx/dy = new-minus-last convention as mouse-drag panning in mouseHandler.ts.
        panCameraByScreenDelta(stateRef.current, mid.x - pinch.lastMid.x, mid.y - pinch.lastMid.y);
        pinch.lastDist = dist;
        pinch.lastMid = mid;
      } else if (activeTouchId !== null) {
        const touch = findTouch(e.touches, activeTouchId);
        if (!touch) return;
        const { x, y } = getCanvasPos(touch);
        onMouseMove(stateRef.current, x, y);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (pinch) {
        const stillDown = findTouch(e.touches, pinch.id1) && findTouch(e.touches, pinch.id2);
        if (!stillDown) pinch = null;
        return;
      }
      if (activeTouchId !== null) {
        const ended = findTouch(e.changedTouches, activeTouchId) ?? e.changedTouches[0];
        endActiveTouchDrag(ended);
      }
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('keydown', handleKey);

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('keydown', handleKey);
    };
  }, [canvasRef, stateRef]);
}
