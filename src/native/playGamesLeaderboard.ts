import { registerPlugin } from '@capacitor/core';

// Thin JS wrapper for PlayGamesLeaderboardPlugin.java (themes/metro.md §9.6) — a
// custom Capacitor plugin local to this app, not an npm package. Android only; every
// method is a no-op-shaped fail-gracefully result on web (Capacitor's default web
// implementation for a plugin with no registered web handler rejects the call), which
// is why callers always go through the platform check in leaderboard/client.ts and
// useLeaderboard.ts rather than calling this directly.
export interface SignInResult {
  signedIn: boolean;
  uid?: string;
  displayName?: string;
}

export interface EntryResult {
  found: boolean;
  uid?: string;
  displayName?: string;
  weeksSurvived?: number;
}

export interface PlayGamesLeaderboardPlugin {
  signIn(): Promise<SignInResult>;
  submitScore(options: { weeksSurvived: number; displayName?: string }): Promise<void>;
  fetchOwnRank(options: { weeksSurvived: number }): Promise<{ rank: number }>;
  fetchTotalPlayers(): Promise<{ count: number }>;
  fetchOwnEntry(options: { uid: string }): Promise<EntryResult>;
  fetchTopN(options: { n: number }): Promise<{ entries: { uid: string; displayName: string; weeksSurvived: number }[] }>;
}

export const PlayGamesLeaderboard = registerPlugin<PlayGamesLeaderboardPlugin>('PlayGamesLeaderboard');
