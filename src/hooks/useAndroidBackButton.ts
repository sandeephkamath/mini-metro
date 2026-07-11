import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type { GamePhase } from '../types/game';

// Android hardware/gesture back button (themes/metro.md §8.1) — a single global
// listener regardless of Phase or open overlays; no-op on web, where back
// navigates browser history as normal. The dialog's wording and primary action
// depend on the Phase active when back was pressed: from `home` it exits the app;
// from any in-run phase it returns to `home` instead (never closes the app outright
// mid-run) — a player who wants to fully quit from mid-run presses back twice.
export function useAndroidBackButton(phase: GamePhase, goHome: () => void) {
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener('backButton', () => setExitConfirmOpen(true));
    return () => { handle.then(h => h.remove()); };
  }, []);

  const atHome = phase === 'home';

  return {
    exitConfirmOpen,
    exitMessage: atHome ? 'Exit game?' : 'Return to main menu?',
    exitConfirmLabel: atHome ? 'Exit' : 'Menu',
    confirmExit: () => {
      setExitConfirmOpen(false);
      if (atHome) App.exitApp();
      else goHome();
    },
    cancelExit: () => setExitConfirmOpen(false),
  };
}
