import { useEffect } from 'react';
import { registerPushNotifications } from '../native/pushNotifications';

// Fires once per app launch (Android only — registerPushNotifications is a no-op on
// web). Mirrors useLeaderboard.ts's native-only sign-in effect: fire-and-forget, no
// return value, nothing else in the app reads its result.
export function usePushNotifications(): void {
  useEffect(() => {
    registerPushNotifications();
  }, []);
}
