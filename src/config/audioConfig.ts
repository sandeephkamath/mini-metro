// Single manifest mapping every theme-neutral audio key (core/logic.md §7) to a
// concrete asset + volume (themes/metro.md §13). To swap any sound later — a
// different synth pass, a licensed/commissioned replacement, anything — drop the new
// file under public/audio/ and change its `src` below. Nothing else in the codebase
// references an audio file path directly.
export const AUDIO_CONFIG = {
  music: {
    home: { src: '/audio/music/home.wav', volume: 0.5 },
    game: { src: '/audio/music/game.wav', volume: 0.4 },
  },
  sfx: {
    passengerDelivered: { src: '/audio/sfx/passenger-delivered.wav', volume: 0.6 },
    stationSpawn: { src: '/audio/sfx/station-spawn.wav', volume: 0.5 },
    lineDrawn: { src: '/audio/sfx/line-drawn.wav', volume: 0.45 },
    milestone: { src: '/audio/sfx/milestone.wav', volume: 0.65 },
    overflowRisk: { src: '/audio/sfx/overflow-risk.wav', volume: 0.5 },
    gameOver: { src: '/audio/sfx/game-over.wav', volume: 0.6 },
  },
} as const;

export type MusicTrackKey = keyof typeof AUDIO_CONFIG.music;
export type SfxKey = keyof typeof AUDIO_CONFIG.sfx;

// Minimum gap between two plays of the same cue (themes/metro.md §5 "Audio Cue
// cooldown") — avoids clipping when several fire in the same instant, without
// dropping the underlying game event.
export const SFX_COOLDOWN_MS = 80;
