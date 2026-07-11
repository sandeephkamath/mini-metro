// Persistence for the mute toggle (themes/metro.md §13 "Mute control") — a single
// localStorage flag, read/write fail silent, same posture as tutorialSeen.ts.

const STORAGE_KEY = 'miniMetro.audioMuted.v1';

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // storage disabled/unavailable — mute just won't persist across sessions
  }
}
