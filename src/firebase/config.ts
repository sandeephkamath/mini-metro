import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// PLACEHOLDER — replace with a real Firebase project's web app config
// (Firebase Console → Project Settings → General → Your apps → SDK setup) before
// the Leaderboard (core/meta_progression.md §7-8, metro.md §9.6) can actually work.
// Everything downstream is written to fail gracefully against an unreachable/invalid
// project (see firebase/leaderboard.ts), so this stub is safe to ship as-is —
// Leaderboard sign-in will simply never succeed until real values are filled in.
const FIREBASE_CONFIG = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const app = initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
