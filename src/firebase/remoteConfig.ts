import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { CONFIG } from '../config/gameConfig';

// Remote Config Overrides (themes/metro.md §5.1) — a single public document that can
// override any CONFIG key. Falls back to pure code defaults on a missing document, a
// missing/unknown key, a Firestore error, or a fetch that outruns the timeout — never
// blocks anything indefinitely.

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    promise.then(value => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    });
  });
}

async function fetchConfigOverrides(): Promise<Record<string, unknown>> {
  const snap = await getDoc(doc(db, 'config', 'gameConfig'));
  return snap.exists() ? snap.data() : {};
}

// Mutates CONFIG in place (see gameConfig.ts) — unknown keys are ignored so a typo in
// the Firestore document can't silently inject a field nothing reads.
export function applyConfigOverrides(overrides: Record<string, unknown>) {
  for (const key of Object.keys(overrides)) {
    if (key in CONFIG) {
      (CONFIG as Record<string, unknown>)[key] = overrides[key];
    }
  }
}

async function loadRemoteConfig(): Promise<void> {
  const overrides = await withTimeout(
    fetchConfigOverrides().catch(() => ({})),
    CONFIG.REMOTE_CONFIG_FETCH_TIMEOUT_MS,
    {},
  );
  applyConfigOverrides(overrides);
}

// Starts the fetch exactly once, the moment this module is first imported (a module's
// top-level code runs once per page load, no matter how many places import it) — the
// home screen renders immediately and doesn't wait on this; it only awaits the promise
// if the player clicks Play before it resolves (HomeScreen.tsx), showing a themed
// loading indicator in place of the Play control for that window instead of a separate
// pre-home loading screen (themes/metro.md §5.1, §8).
export const remoteConfigReady: Promise<void> = loadRemoteConfig();
