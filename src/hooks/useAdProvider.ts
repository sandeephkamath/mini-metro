import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB_REWARDED_AD_UNIT_ID } from '../ads/config';

const PRELOAD_RETRY_MS = 30_000;

// Real AdMob rewarded ads (themes/metro.md §4.2) — Android only, since AdMob has no
// web SDK. On web this hook is inert (`ready` stays true, `show` is never called) —
// GameCanvas.tsx keeps using SimulatedAdModal there instead, unchanged.
//
// Mirrors useLeaderboard.ts's shape: a React hook owns the external SDK's async
// state; GameCanvas.tsx threads the simple `ready` value into the mutable GameState
// so src/logic/monetization.ts's isAdAvailable stays a pure function.
export function useAdProvider() {
  const isNative = Capacitor.isNativePlatform();
  const [ready, setReady] = useState(!isNative);
  const preloadingRef = useRef(false);

  // "Available" (core/monetization.md §1) now concretely means "a rewarded ad is
  // currently loaded" — proactively preload on mount and after every consumed ad, so
  // it's normally already ready by the time a player requests one. A simple fixed
  // retry on failure is enough here; no need for backoff given how infrequently a
  // preload actually fails in practice.
  const preload = useCallback(() => {
    if (!isNative || preloadingRef.current) return;
    preloadingRef.current = true;
    AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_AD_UNIT_ID }).catch(() => {
      preloadingRef.current = false;
      setTimeout(preload, PRELOAD_RETRY_MS);
    });
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;
    let loadedHandle: PluginListenerHandle | undefined;
    let failedHandle: PluginListenerHandle | undefined;

    AdMob.initialize().then(preload);
    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      preloadingRef.current = false;
      setReady(true);
    }).then(h => { loadedHandle = h; });
    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      preloadingRef.current = false;
      setReady(false);
      setTimeout(preload, PRELOAD_RETRY_MS);
    }).then(h => { failedHandle = h; });

    return () => {
      loadedHandle?.remove();
      failedHandle?.remove();
    };
  }, [isNative, preload]);

  // Resolves { rewarded: true } only if the Rewarded event fired before the ad
  // closed. Driven entirely by the plugin's documented events rather than
  // showRewardVideoAd()'s own promise, since that promise's resolution/rejection
  // behavior on a no-reward dismiss isn't documented — Dismissed (or FailedToShow)
  // is the one event guaranteed to fire once the flow is actually over.
  const show = useCallback(async (): Promise<{ rewarded: boolean }> => {
    if (!isNative) return { rewarded: false };
    setReady(false);

    let rewarded = false;
    let resolveDone: (() => void) | undefined;
    const done = new Promise<void>(resolve => { resolveDone = resolve; });

    const rewardedHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      rewarded = true;
    });
    const dismissedHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => resolveDone!());
    const failedHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => resolveDone!());

    AdMob.showRewardVideoAd().catch(() => resolveDone!());

    await done;
    rewardedHandle.remove();
    dismissedHandle.remove();
    failedHandle.remove();
    preload();
    return { rewarded };
  }, [isNative, preload]);

  return { ready, show, isNative };
}
