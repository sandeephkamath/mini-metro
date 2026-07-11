import { useEffect } from 'react';
import type { GamePhase } from '../types/game';
import { pauseMusicForBackground, playMusic, resumeMusicFromBackground, unlockAudio } from '../audio/audioManager';

// Menu Track for home/gameover, Session Track for playing (themes/metro.md §13).
// A one-time gesture listener unlocks playback per core/logic.md §7 — registered
// once, independent of phase, so the very first tap/click/key anywhere (including
// the Home Screen's own Play button) starts whichever track is already pending.
export function useAudio(phase: GamePhase): void {
  useEffect(() => {
    function unlock() {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Same background/foreground signal useGameLoop.ts already uses to reset its
  // clock (document.hidden) — Background Music otherwise keeps looping, audible,
  // while the app isn't in front of the player (themes/metro.md B26).
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        pauseMusicForBackground();
      } else {
        resumeMusicFromBackground();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    playMusic(phase === 'playing' ? 'game' : 'home');
  }, [phase]);
}
