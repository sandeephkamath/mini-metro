import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Android hardware/gesture back button (themes/metro.md §8.1) — a single global
// listener regardless of Phase or open overlays; no-op on web, where back
// navigates browser history as normal.
export function useAndroidBackButton() {
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener('backButton', () => setExitConfirmOpen(true));
    return () => { handle.then(h => h.remove()); };
  }, []);

  return {
    exitConfirmOpen,
    confirmExit: () => App.exitApp(),
    cancelExit: () => setExitConfirmOpen(false),
  };
}
