import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// FCM device token registration (core/analytics.md §3, themes/metro.md §12.2) —
// Android only, via the official Capacitor plugin (wraps the native Firebase
// Messaging SDK, reuses the same google-services.json already in place for the
// Leaderboard). Registration only makes a device reachable; nothing sends a
// notification yet (deliberately out of scope, see the spec).
export async function registerPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let status = (await PushNotifications.checkPermissions()).receive;
    if (status === 'prompt') {
      status = (await PushNotifications.requestPermissions()).receive;
    }
    if (status !== 'granted') return;

    PushNotifications.addListener('registration', token => {
      setDoc(doc(db, 'pushTokens', token.value), {
        platform: 'android',
        registeredAt: serverTimestamp(),
      }).catch(() => {});
    });
    PushNotifications.addListener('registrationError', () => {});

    await PushNotifications.register();
  } catch {
    // fail gracefully — core/analytics.md §5
  }
}
