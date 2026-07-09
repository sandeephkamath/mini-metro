import { useCallback, useState } from 'react';
import type { LeaderboardIdentity } from '../firebase/leaderboard';
import { signInWithGoogle, submitScore, fetchOwnRank, fetchTotalPlayers } from '../firebase/leaderboard';

export interface LeaderboardResult {
  rank: number;
  totalPlayers: number | null; // best-effort — a failed count query still lets rank show
}

// The Leaderboard's availability + identity (core/meta_progression.md §7-8,
// metro.md §9.6). Production identity is Android + Play Games sign-in (not yet
// implemented — gated on Android packaging, per memo.md § Leaderboard); until then,
// the interim Google Sign-In popup (home screen's "Sign In" icon, or the `L` debug
// shortcut per DEBUG.md § Debug Leaderboard Sign-In) is what makes this available.
export function useLeaderboard() {
  const [identity, setIdentity] = useState<LeaderboardIdentity | null>(null);

  const signIn = useCallback(async () => {
    const result = await signInWithGoogle();
    if (result) setIdentity(result);
  }, []);

  // Submits this session's Final Weeks Survived, then resolves this player's own
  // rank (and the total player count, for "#4,382 of 61,203 players") against it —
  // called together so the rank reflects the just-submitted score (core §7: "the
  // same moment Best Weeks Survived is evaluated locally").
  // No error UI is spec'd for the game-over rank line (home_screen.md leaves it as
  // "simply appears a moment later once ready") — a failed rank fetch here just
  // means the line never appears, same fail-gracefully principle as everywhere else.
  const submitAndFetchRank = useCallback(async (weeksSurvived: number): Promise<LeaderboardResult | null> => {
    if (!identity) return null;
    await submitScore(identity, weeksSurvived);
    try {
      const rank = await fetchOwnRank(weeksSurvived);
      const totalPlayers = await fetchTotalPlayers().catch(() => null);
      return { rank, totalPlayers };
    } catch {
      return null;
    }
  }, [identity]);

  return {
    available: identity !== null,
    identity,
    signIn,
    submitAndFetchRank,
  };
}
