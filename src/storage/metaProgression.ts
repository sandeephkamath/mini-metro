// Persistence for core/meta_progression.md §6, metro.md §9.5 — the only game
// state that survives beyond a single session. Backed by a single localStorage
// key; every read/write fails silent (falls back to the zero state) per the
// "never block play, never surface an error" rule in the spec.

import { getSessionRevealSegments, type RevealSegment } from '../logic/collectibles';

const STORAGE_KEY = 'miniMetro.metaProgression.v1';

export interface MetaProgressionData {
  bestWeeksSurvived: number;
  collectionSize: number; // count of Complete Pictures (meta_progression.md §3)
  currentPictureProgress: number; // Accumulated Progress toward the current Picture
}

// Temporary override (metro.md §9.5, as of 2026-07-08, revisit before real
// launch): pre-seeds Picture 1 (London) as already Complete rather than a
// genuinely empty Collection, so the Collectibles feature has something to
// show on a fresh install without requiring a full session first. Only
// applies when there's no valid saved data at all — set back to 0 to restore
// the true empty-Collection zero state.
const ZERO_STATE: MetaProgressionData = {
  bestWeeksSurvived: 0,
  collectionSize: 1,
  currentPictureProgress: 0,
};

export function loadMetaProgression(): MetaProgressionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...ZERO_STATE };
    const parsed = JSON.parse(raw);
    return {
      bestWeeksSurvived: typeof parsed.bestWeeksSurvived === 'number' ? parsed.bestWeeksSurvived : 0,
      collectionSize: typeof parsed.collectionSize === 'number' ? parsed.collectionSize : 0,
      currentPictureProgress: typeof parsed.currentPictureProgress === 'number' ? parsed.currentPictureProgress : 0,
    };
  } catch {
    return { ...ZERO_STATE };
  }
}

function saveMetaProgression(data: MetaProgressionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage disabled/unavailable/quota exceeded — meta-progression is a bonus
    // layer, never a requirement to play (core/meta_progression.md §6)
  }
}

// Called once, at the end of a session, right after Final Weeks Survived is known.
// Updates Best Weeks Survived and applies this session's contribution to the
// current Collectible Reward (core/meta_progression.md §3), unconditionally —
// every completed session moves the Collection forward, even a 0-week one.
// Returns the reveal segments too (themes/metro.md §9.4 Game-Over Reveal) so the
// UI can animate through exactly what changed, not just the final resting state.
// isNewBest reflects whether *this* session raised Best Weeks Survived, for the
// game-over screen's "New Best!" callout vs. plain Personal Best line (§9.2).
export function recordSessionEnd(
  finalWeeksSurvived: number,
): { data: MetaProgressionData; segments: RevealSegment[]; isNewBest: boolean } {
  const current = loadMetaProgression();
  const segments = getSessionRevealSegments(
    { collectionSize: current.collectionSize, currentProgress: current.currentPictureProgress },
    finalWeeksSurvived,
  );
  const last = segments[segments.length - 1];
  const data: MetaProgressionData = {
    bestWeeksSurvived: Math.max(current.bestWeeksSurvived, finalWeeksSurvived),
    collectionSize: last.index - 1,
    currentPictureProgress: last.endProgress,
  };
  saveMetaProgression(data);
  return { data, segments, isNewBest: finalWeeksSurvived > current.bestWeeksSurvived };
}
