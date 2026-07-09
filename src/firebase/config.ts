import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Read from .env.local (gitignored via *.local, never committed — see .env.example
// for the shape). Falls back to REPLACE_ME placeholders if that file is absent, so a
// fresh clone without it still boots — everything downstream is written to fail
// gracefully against an unreachable/invalid project (see firebase/leaderboard.ts).
// Note: a Firebase web app's apiKey is not actually a secret on its own — Firebase's
// security model relies on Firestore/Auth rules, not key confidentiality — but keeping
// real project identifiers out of the repo is still the safer default.
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'REPLACE_ME',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'REPLACE_ME.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'REPLACE_ME',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'REPLACE_ME.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? 'REPLACE_ME',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'REPLACE_ME',
};

const app = initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
