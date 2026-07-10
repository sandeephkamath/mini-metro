import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { app } from './config';

// Fires immediately at module load, same "start now, never block anything on it"
// posture as remoteConfig.ts's remoteConfigReady. isSupported() also covers the
// REPLACE_ME/no-measurementId case (config.ts) — an invalid config never resolves
// a usable Analytics instance, so analyticsInstance just stays null forever.
let analyticsInstance: Analytics | null = null;
isSupported()
  .then(supported => {
    if (supported) analyticsInstance = getAnalytics(app);
  })
  .catch(() => {});

// core/analytics.md §1: fire-and-forget, never visible to the player if it fails.
export function logGameEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (!analyticsInstance) return;
  try {
    logEvent(analyticsInstance, name, params);
  } catch {
    // swallow — see core/analytics.md §5 Fail Gracefully
  }
}
