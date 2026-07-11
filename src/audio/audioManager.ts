// Drives Background Music + Audio Cues (core/logic.md §7, themes/metro.md §13).
// The only module in the codebase that touches the Audio DOM API — logic files just
// push AudioCueType values onto GameState.audioEvents (core §8: no DOM access in
// src/logic/), and useGameLoop.ts drains that queue into playSfx() once per frame.
import type { AudioCueType, GameState } from '../types/game';
import { AUDIO_CONFIG, SFX_COOLDOWN_MS, type MusicTrackKey, type SfxKey } from '../config/audioConfig';
import { loadMuted, saveMuted } from '../storage/audioSettings';

const CUE_TO_SFX: Record<AudioCueType, SfxKey> = {
  passengerDelivered: 'passengerDelivered',
  stationSpawn: 'stationSpawn',
  lineDrawn: 'lineDrawn',
  milestone: 'milestone',
  overflowRisk: 'overflowRisk',
  gameOver: 'gameOver',
};

let muted = loadMuted();
// Playback can't start until a user gesture has occurred (browsers block autoplay) —
// see core §7's closing note. unlockAudio() flips this once, from a one-time gesture
// listener registered by useAudio.ts.
let unlocked = false;
let pendingTrack: MusicTrackKey | null = null;
let currentTrack: MusicTrackKey | null = null;

const musicEls: Partial<Record<MusicTrackKey, HTMLAudioElement>> = {};
const lastPlayedAtMs: Partial<Record<SfxKey, number>> = {};

function getMusicEl(track: MusicTrackKey): HTMLAudioElement {
  let el = musicEls[track];
  if (!el) {
    const cfg = AUDIO_CONFIG.music[track];
    el = new Audio(cfg.src);
    el.loop = true;
    el.volume = muted ? 0 : cfg.volume;
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
  if (!unlocked) {
    pendingTrack = track;
    return;
  }
  getMusicEl(track).play().catch(() => {});
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  if (pendingTrack) {
    const track = pendingTrack;
    pendingTrack = null;
    getMusicEl(track).play().catch(() => {});
  }
}

export function playSfx(key: SfxKey): void {
  if (muted || !unlocked) return;
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

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  saveMuted(next);
  for (const key of Object.keys(musicEls) as MusicTrackKey[]) {
    musicEls[key]!.volume = muted ? 0 : AUDIO_CONFIG.music[key].volume;
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
