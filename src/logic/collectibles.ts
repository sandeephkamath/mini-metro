import { CONFIG } from '../config/gameConfig';

// Collectible Reward progression (core/meta_progression.md §3), instantiated as
// metro's Picture Collection (themes/metro.md §9.3). Pure math only — no rendering,
// no Firestore/curated-pool overrides yet (themes/metro.md §9.3.1, a later phase).
// Collectible Reward index is 1-based throughout.

export interface CollectibleProgress {
  collectionSize: number; // count of Complete Pictures — the current index is always collectionSize + 1
  currentProgress: number; // Accumulated Progress toward the current Picture
}

// required(N) = base × growthRate^(N-1) — core/meta_progression.md §3.
export function getRequiredProgress(index: number): number {
  return CONFIG.PICTURE_BASE_REQUIREMENT * Math.pow(CONFIG.PICTURE_GROWTH_RATE, index - 1);
}

// A Reveal Step's progress cost is required(N) / Reveal Step count (core §3).
export function getRevealStepProgress(index: number): number {
  return getRequiredProgress(index) / CONFIG.PICTURE_TILE_COUNT;
}

// How many of a Picture's tiles are revealed at a given Accumulated Progress —
// tile K reveals once Accumulated Progress >= required(N) × (K / T) (metro.md §9.3).
export function getRevealedTileCount(index: number, accumulatedProgress: number): number {
  const required = getRequiredProgress(index);
  return Math.min(CONFIG.PICTURE_TILE_COUNT, Math.floor((accumulatedProgress / required) * CONFIG.PICTURE_TILE_COUNT));
}

// One Picture's worth of a session's contribution — the unit the Game-Over Reveal
// animates through (metro.md §9.4): a count-up from startProgress to endProgress,
// one segment per Picture a strong session spans (completing multiple in a row).
export interface RevealSegment {
  index: number;
  required: number;
  startProgress: number;
  endProgress: number;
  completed: boolean; // true if this segment's contribution completed the Picture
}

// Splits one session's Final Weeks Survived into per-Picture segments, applying
// the Minimum Session Contribution floor once up front and then carrying any
// completion surplus into as many subsequent Pictures as it reaches.
export function getSessionRevealSegments(
  progress: CollectibleProgress,
  finalWeeksSurvived: number,
): RevealSegment[] {
  let index = progress.collectionSize + 1;
  let remaining = Math.max(finalWeeksSurvived, getRevealStepProgress(index));
  let start = progress.currentProgress;
  const segments: RevealSegment[] = [];

  for (;;) {
    const required = getRequiredProgress(index);
    const end = start + remaining;
    if (end >= required) {
      segments.push({ index, required, startProgress: start, endProgress: required, completed: true });
      remaining = end - required;
      start = 0;
      index += 1;
    } else {
      segments.push({ index, required, startProgress: start, endProgress: end, completed: false });
      return segments;
    }
  }
}

// Applies one session's Final Weeks Survived to the current Collectible Reward —
// the net result of getSessionRevealSegments, without the intermediate detail.
export function applySessionContribution(
  progress: CollectibleProgress,
  finalWeeksSurvived: number,
): CollectibleProgress {
  const segments = getSessionRevealSegments(progress, finalWeeksSurvived);
  const last = segments[segments.length - 1];
  return { collectionSize: last.index - 1, currentProgress: last.endProgress };
}
