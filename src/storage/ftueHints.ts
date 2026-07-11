// Persistence for the two post-tutorial contextual hints (TUTORIAL.md §9) — two
// independent, lifetime-once localStorage flags, same fail-silent posture as
// tutorialSeen.ts. Deliberately separate from both the Tutorial's own flag and
// meta-progression: this is onboarding state tied to a specific UI moment.

const MILESTONE_CHOICE_KEY = 'miniMetro.hintSeen.milestoneChoice.v1';
const LINE_UNLOCK_KEY = 'miniMetro.hintSeen.lineUnlock.v1';

function hasSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markSeen(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // storage disabled/unavailable — the hint just shows every time instead
  }
}

export function hasSeenMilestoneChoiceHint(): boolean {
  return hasSeen(MILESTONE_CHOICE_KEY);
}

export function markMilestoneChoiceHintSeen(): void {
  markSeen(MILESTONE_CHOICE_KEY);
}

export function hasSeenLineUnlockHint(): boolean {
  return hasSeen(LINE_UNLOCK_KEY);
}

export function markLineUnlockHintSeen(): void {
  markSeen(LINE_UNLOCK_KEY);
}
