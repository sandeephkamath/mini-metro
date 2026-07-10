import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState, Vec2 } from '../types/game';
import { onMouseDown, onMouseMove, onMouseUp, onWheel } from '../input/mouseHandler';
import { zoomAtScreenPoint, panCameraByScreenDelta } from '../logic/camera';
import { startTutorial, exitTutorial } from '../logic/tutorial';
import { logGameEvent } from '../firebase/analytics';

interface UseMouseInputOptions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<GameState>;
  // Whether GameCanvas.tsx is currently presenting the stage rotated 90° (portrait
  // viewport — themes/metro.md §6.1). A ref, not a prop passed by value, so these
  // native listeners always read the latest state without needing to re-attach.
  rotatedRef: MutableRefObject<boolean>;
  // DEBUG.md § Debug Leaderboard Sign-In (key L) — the actual sign-in is async and
  // lives in the React-level useLeaderboard hook, outside the mutable GameState
  // this hook otherwise operates on, so it's a callback rather than a ref mutation.
  onDebugLeaderboardSignIn?: () => void;
}

export function useMouseInput({ canvasRef, stateRef, rotatedRef, onDebugLeaderboardSignIn }: UseMouseInputOptions) {
  // A ref, not a dependency of the effect below — keeps the native listeners'
  // identity stable across renders (they must not re-attach on every parent
  // re-render, matching the existing rotatedRef pattern) even though this
  // callback's own identity may change each render.
  const onDebugLeaderboardSignInRef = useRef(onDebugLeaderboardSignIn);
  onDebugLeaderboardSignInRef.current = onDebugLeaderboardSignIn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Under a 90°-rotated presentation, the rect returned by getBoundingClientRect
    // is the rotated on-screen bounding box (width/height swapped relative to the
    // canvas's own intrinsic pixels) — screen-X no longer maps to canvas-local X,
    // it maps to canvas-local Y (and vice versa, with one axis inverted). Derived
    // by tracking where each of the design box's 4 corners ends up on screen under
    // CSS `rotate(90deg)`: local (0,0)→screen top-right, (W,0)→bottom-right,
    // (0,H)→top-left, (W,H)→bottom-left. u/v below are the touch/click position
    // normalized 0..1 within the on-screen rect, independent of rotation.
    function getCanvasPos(e: { clientX: number; clientY: number }) {
      const rect = canvas!.getBoundingClientRect();
      const u = (e.clientX - rect.left) / rect.width;
      const v = (e.clientY - rect.top) / rect.height;
      if (rotatedRef.current) {
        return { x: v * canvas!.width, y: (1 - u) * canvas!.height };
      }
      return { x: u * canvas!.width, y: v * canvas!.height };
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
      // While the tutorial runs, Escape skips it and every other key (including
      // the D toggle and all debug keys) is suspended — specs/TUTORIAL.md §3.
      if (s.tutorial) {
        if (e.key === 'Escape') exitTutorial(s);
        return;
      }
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
          s.debugAdForcedUnavailable = false;
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
      } else if (e.key === 't' || e.key === 'T') {
        startTutorial(s); // no-op unless the board is startable (specs/TUTORIAL.md §1)
        if (s.tutorial !== null) logGameEvent('tutorial_started');
      } else if (e.key === 'v' || e.key === 'V') {
        // DEBUG.md § Debug Ad Availability — 'playing' phase only.
        if (s.phase === 'playing') s.debugAdForcedUnavailable = !s.debugAdForcedUnavailable;
      } else if (e.key === 'l' || e.key === 'L') {
        // DEBUG.md § Debug Leaderboard Sign-In — 'home'/'gameover' phases only.
        if (s.phase === 'home' || s.phase === 'gameover') onDebugLeaderboardSignInRef.current?.();
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
  }, [canvasRef, stateRef, rotatedRef]);
}
