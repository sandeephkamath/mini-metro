// Drives Background Music + Audio Cues (core/logic.md §7, themes/metro.md §13).
// The only module in the codebase that touches the Audio DOM API — logic files just
// push AudioCueType values onto GameState.audioEvents (core §8: no DOM access in
// src/logic/), and useGameLoop.ts drains that queue into playSfx() once per frame.
import { Capacitor } from '@capacitor/core';
import type { AudioCueType, GameState } from '../types/game';
import { AUDIO_CONFIG, SFX_COOLDOWN_MS, type MusicTrackKey, type SfxKey } from '../config/audioConfig';
import { loadMusicEnabled, loadSoundEnabled, saveMusicEnabled, saveSoundEnabled } from '../storage/audioSettings';

const CUE_TO_SFX: Record<AudioCueType, SfxKey> = {
  passengerDelivered: 'passengerDelivered',
  stationSpawn: 'stationSpawn',
  lineDrawn: 'lineDrawn',
  milestone: 'milestone',
  overflowRisk: 'overflowRisk',
  gameOver: 'gameOver',
};

let musicEnabled = loadMusicEnabled();
let soundEnabled = loadSoundEnabled();
// Playback can't start fully unmuted until a user gesture has occurred in a real
// browser — see core §7's closing note. `playMusic` below attempts *muted*
// autoplay immediately regardless (broadly allowed without a gesture), and
// unlockAudio() just flips the currently-playing track's `.muted` off once a
// one-time gesture listener (useAudio.ts) fires. The packaged Android app has no
// such restriction — Capacitor's Bridge configures its WebView with
// `setMediaPlaybackRequiresUserGesture(false)`, so unmuted autoplay already works
// there from the first frame; starting "locked" anyway just meant the player heard
// nothing until their first tap for no platform-imposed reason (themes/metro.md B26).
let unlocked = Capacitor.isNativePlatform();
let currentTrack: MusicTrackKey | null = null;

const musicEls: Partial<Record<MusicTrackKey, HTMLAudioElement>> = {};
const lastPlayedAtMs: Partial<Record<SfxKey, number>> = {};

function getMusicEl(track: MusicTrackKey): HTMLAudioElement {
  let el = musicEls[track];
  if (!el) {
    const cfg = AUDIO_CONFIG.music[track];
    el = new Audio(cfg.src);
    el.loop = true;
    el.volume = musicEnabled ? cfg.volume : 0;
    musicEls[track] = el;
  }
  return el;
}

export function playMusic(track: MusicTrackKey): void {
  if (currentTrack === track) return;
  currentTrack = track;
  for (const key of Object.keys(musicEls) as MusicTrackKey[]) {
    if (key !== track) musicEls[key]?.pause();
  }
  const el = getMusicEl(track);
  el.muted = !unlocked;
  el.play().catch(() => {});
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  if (currentTrack) {
    const el = getMusicEl(currentTrack);
    el.muted = false;
    el.play().catch(() => {});
  }
}

// The app going to the background (tab hidden, or Android home/recents) doesn't
// pause an HTML <audio> element on its own — without this the Menu/Session Track
// keeps looping and audible (on native, where playback isn't gesture/tab-gated)
// while the player isn't even looking at the game (themes/metro.md B26).
export function pauseMusicForBackground(): void {
  if (currentTrack) musicEls[currentTrack]?.pause();
}

export function resumeMusicFromBackground(): void {
  if (!currentTrack) return;
  const el = getMusicEl(currentTrack);
  el.muted = !unlocked;
  el.play().catch(() => {});
}

export function playSfx(key: SfxKey): void {
  if (!soundEnabled || !unlocked) return;
  const now = performance.now();
  const last = lastPlayedAtMs[key] ?? 0;
  if (now - last < SFX_COOLDOWN_MS) return;
  lastPlayedAtMs[key] = now;
  const cfg = AUDIO_CONFIG.sfx[key];
  // A fresh element per play (rather than one reused element) so overlapping cues
  // (e.g. two deliveries in quick succession) can both sound — core §7 "fire-and-forget".
  const el = new Audio(cfg.src);
  el.volume = cfg.volume;
  el.play().catch(() => {});
}

// Drains GameState.audioEvents (queued by logic this frame) into actual playback,
// then clears it. Called once per RAF frame from useGameLoop.ts.
export function playQueuedCues(state: GameState): void {
  if (state.audioEvents.length === 0) return;
  for (const cue of state.audioEvents) {
    playSfx(CUE_TO_SFX[cue]);
  }
  state.audioEvents.length = 0;
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function setMusicEnabled(next: boolean): void {
  musicEnabled = next;
  saveMusicEnabled(next);
  for (const key of Object.keys(musicEls) as MusicTrackKey[]) {
    musicEls[key]!.volume = musicEnabled ? AUDIO_CONFIG.music[key].volume : 0;
  }
}

export function toggleMusic(): boolean {
  setMusicEnabled(!musicEnabled);
  return musicEnabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(next: boolean): void {
  soundEnabled = next;
  saveSoundEnabled(next);
}

export function toggleSound(): boolean {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}
