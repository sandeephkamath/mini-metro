import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  collection, doc, setDoc, getDoc, getDocs, getCountFromServer, query, orderBy, limit, where, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';

// Leaderboard client (core/meta_progression.md §7-8, metro.md §9.6). No dedicated
// server exists.
//
// Two failure-handling styles, matching what each caller can do with an error:
// - Sign-in and submission are fire-and-forget with no error UI anywhere they're
//   spec'd (a declined/failed sign-in just leaves the Leaderboard hidden, "same as
//   normal"; a rejected submission has nothing further to do) — they swallow
//   errors and resolve to null/void.
// - The read functions (top N, rank, own entry) feed UI that spec explicitly wants
//   to distinguish "legitimately empty" from "the fetch failed" (home_screen.md's
//   Leaderboard modal: a retry control on failure) — they let errors propagate so
//   the caller can tell the difference.

export interface LeaderboardIdentity {
  uid: string;
  displayName: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  weeksSurvived: number;
}

const LEADERBOARD_COLLECTION = 'leaderboard';

// Interim identity (themes/metro.md §9.6): Firebase's own "Sign in with Google"
// popup, distinct from the eventual production Play Games path (Android-only, not
// yet implemented). Triggered by the home screen's real "Sign In" icon, and by the
// `L` debug shortcut (DEBUG.md § Debug Leaderboard Sign-In) as a faster path to the
// same flow while testing.
export async function signInWithGoogle(): Promise<LeaderboardIdentity | null> {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return {
      uid: result.user.uid,
      displayName: result.user.displayName ?? 'Player',
    };
  } catch {
    return null;
  }
}

// The client never needs to compare against a previous value first (core §7) —
// Firestore Security Rules (firestore.rules) are what actually reject a
// regressing or out-of-range submission.
export async function submitScore(identity: LeaderboardIdentity, weeksSurvived: number): Promise<void> {
  try {
    await setDoc(doc(db, LEADERBOARD_COLLECTION, identity.uid), {
      displayName: identity.displayName,
      weeksSurvived,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // rejected by security rules (e.g. a regression), or unreachable — fine either way
  }
}

export async function fetchLeaderboardTopN(n: number): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(query(collection(db, LEADERBOARD_COLLECTION), orderBy('weeksSurvived', 'desc'), limit(n)));
  return snap.docs.map(d => ({
    uid: d.id,
    displayName: d.data().displayName as string,
    weeksSurvived: d.data().weeksSurvived as number,
  }));
}

// Rank = 1 + count of players strictly ahead — an aggregation query, not a
// dedicated server, per the "no server" architecture (memo.md § Leaderboard).
export async function fetchOwnRank(weeksSurvived: number): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, LEADERBOARD_COLLECTION), where('weeksSurvived', '>', weeksSurvived)),
  );
  return snap.data().count + 1;
}

export async function fetchOwnEntry(uid: string): Promise<LeaderboardEntry | null> {
  const snap = await getDoc(doc(db, LEADERBOARD_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid, displayName: snap.data().displayName as string, weeksSurvived: snap.data().weeksSurvived as number };
}

// For "#4,382 of 61,203 players" (metro.md §9.6 game-over display).
export async function fetchTotalPlayers(): Promise<number> {
  const snap = await getCountFromServer(collection(db, LEADERBOARD_COLLECTION));
  return snap.data().count;
}
