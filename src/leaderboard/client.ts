import { Capacitor } from '@capacitor/core';
import type { LeaderboardEntry, LeaderboardIdentity } from '../firebase/leaderboard';
import * as web from '../firebase/leaderboard';
import { PlayGamesLeaderboard } from '../native/playGamesLeaderboard';

export type { LeaderboardEntry, LeaderboardIdentity };

// Dispatches every Leaderboard read/write to the right SDK for the current identity
// source (themes/metro.md §9.6 Backend): the native Firebase SDK on Android, once
// signed in via Play Games (native-only session, invisible to the JS SDK — see
// PlayGamesLeaderboardPlugin.java), or the existing Firebase JS SDK (firebase/leaderboard.ts)
// everywhere else. useLeaderboard.ts and LeaderboardScreen.tsx both go through this
// rather than importing firebase/leaderboard.ts directly, so neither has to know which
// SDK is actually in play.
const isNative = () => Capacitor.isNativePlatform();

export async function submitScore(identity: LeaderboardIdentity, weeksSurvived: number): Promise<void> {
  if (isNative()) {
    await PlayGamesLeaderboard.submitScore({ weeksSurvived, displayName: identity.displayName });
    return;
  }
  return web.submitScore(identity, weeksSurvived);
}

export async function fetchOwnRank(weeksSurvived: number): Promise<number> {
  if (isNative()) {
    const { rank } = await PlayGamesLeaderboard.fetchOwnRank({ weeksSurvived });
    return rank;
  }
  return web.fetchOwnRank(weeksSurvived);
}

export async function fetchTotalPlayers(): Promise<number> {
  if (isNative()) {
    const { count } = await PlayGamesLeaderboard.fetchTotalPlayers();
    return count;
  }
  return web.fetchTotalPlayers();
}

export async function fetchLeaderboardTopN(n: number): Promise<LeaderboardEntry[]> {
  if (isNative()) {
    const { entries } = await PlayGamesLeaderboard.fetchTopN({ n });
    return entries;
  }
  return web.fetchLeaderboardTopN(n);
}

export async function fetchOwnEntry(uid: string): Promise<LeaderboardEntry | null> {
  if (isNative()) {
    const result = await PlayGamesLeaderboard.fetchOwnEntry({ uid });
    if (!result.found) return null;
    return { uid: result.uid!, displayName: result.displayName!, weeksSurvived: result.weeksSurvived! };
  }
  return web.fetchOwnEntry(uid);
}
