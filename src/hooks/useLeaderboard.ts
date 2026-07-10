import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { LeaderboardIdentity } from '../firebase/leaderboard';
import { signInWithGoogle } from '../firebase/leaderboard';
import { submitScore, fetchOwnRank, fetchTotalPlayers } from '../leaderboard/client';
import { PlayGamesLeaderboard } from '../native/playGamesLeaderboard';
import { logGameEvent } from '../firebase/analytics';

export interface LeaderboardResult {
  rank: number;
  totalPlayers: number | null; // best-effort — a failed count query still lets rank show
}

// The Leaderboard's availability + identity (core/meta_progression.md §7-8,
// metro.md §9.6). Two identity sources: Play Games Sign-In on Android (silent, once
// on launch, no button — see the effect below), or the interim Google Sign-In popup
// on web (home screen's "Sign In" icon, or the `L` debug shortcut per DEBUG.md §
// Debug Leaderboard Sign-In). Submission/rank reads go through leaderboard/client.ts,
// which picks the right SDK for whichever identity source is actually active.
export function useLeaderboard() {
  const isNative = Capacitor.isNativePlatform();
  const [identity, setIdentity] = useState<LeaderboardIdentity | null>(null);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    PlayGamesLeaderboard.signIn()
      .then(result => {
        if (!cancelled && result.signedIn) {
          setIdentity({ uid: result.uid!, displayName: result.displayName! });
          logGameEvent('leaderboard_sign_in', { platform: 'android' });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isNative]);

  const signIn = useCallback(async () => {
    if (isNative) return; // production identity above is automatic — no button on Android (home_screen.md)
    const result = await signInWithGoogle();
    if (result) {
      setIdentity(result);
      logGameEvent('leaderboard_sign_in', { platform: 'web' });
    }
  }, [isNative]);

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
    logGameEvent('leaderboard_score_submitted', { weeks_survived: Math.round(weeksSurvived * 100) / 100 });
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
