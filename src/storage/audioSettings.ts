// Persistence for the Music/Sound toggles (themes/metro.md §13 "Music/Sound
// controls") — two independent localStorage flags, read/write fail silent, same
// posture as tutorialSeen.ts. Both default to enabled when unset.

const MUSIC_KEY = 'miniMetro.musicEnabled.v1';
const SOUND_KEY = 'miniMetro.soundEnabled.v1';

function loadFlag(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

function saveFlag(key: string, enabled: boolean): void {
  try {
    localStorage.setItem(key, enabled ? '1' : '0');
  } catch {
    // storage disabled/unavailable — setting just won't persist across sessions
  }
}

export function loadMusicEnabled(): boolean {
  return loadFlag(MUSIC_KEY);
}

export function saveMusicEnabled(enabled: boolean): void {
  saveFlag(MUSIC_KEY, enabled);
}

export function loadSoundEnabled(): boolean {
  return loadFlag(SOUND_KEY);
}

export function saveSoundEnabled(enabled: boolean): void {
  saveFlag(SOUND_KEY, enabled);
}
