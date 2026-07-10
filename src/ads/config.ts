// AdMob rewarded ad unit ID (themes/metro.md §4.2 — Android only, AdMob has no web
// SDK). Falls back to Google's public test rewarded ad unit ID, which always serves
// a real (non-monetized) test ad with no AdMob account/app registration needed — the
// standard way to develop/test against AdMob without risking policy violations from
// real ad unit IDs in a dev build. Swap in the real one, once the app is registered
// in the AdMob console, via VITE_ADMOB_REWARDED_AD_UNIT_ID — same env-var pattern as
// src/firebase/config.ts.
const GOOGLE_TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

export const ADMOB_REWARDED_AD_UNIT_ID: string =
  import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID ?? GOOGLE_TEST_REWARDED_AD_UNIT_ID;
