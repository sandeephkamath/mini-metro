// Persistence for the Tutorial's player-facing auto-trigger (specs/TUTORIAL.md §1,
// §8; themes/metro.md §8). A single localStorage flag tracking whether the scripted
// Tutorial has ever been shown to this browser — read/write fail silent (never block
// play), same posture as src/storage/metaProgression.ts.

const STORAGE_KEY = 'miniMetro.tutorialSeen.v1';

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // storage disabled/unavailable — the auto-trigger is a one-time nicety,
    // never a requirement to play
  }
}
