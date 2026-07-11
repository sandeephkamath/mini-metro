// One-off generator for every audio asset under public/audio/ — see
// specs/themes/metro.md §13 "Sourcing". Re-run with `node scripts/generate-audio.mjs`
// whenever the synthesis parameters below change; nothing at runtime depends on this
// script, only on the .wav files it writes.
//
// Everything is built from the C major pentatonic scale (C D E G A) across octaves so
// the two Music Tracks and all Audio Cues share one harmonic world (metro.md §13).
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(__dirname, '..', 'public', 'audio');

const SR = 22050;

// Pentatonic scale, by note name -> Hz (A4 = 440).
const N = {
  C1: 32.70, D1: 36.71, E1: 41.20, G1: 49.00, A1: 55.00,
  C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.00,
};

function smoothstep(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

// note: { freq, start, dur, amp, attack, release, detune, harmonic2 }
// Renders into stereo buffers, additively — attack/release are fractions of `dur`
// shaped as a symmetric swell (silence -> full -> silence) unless dur is short, in
// which case attack/release are absolute seconds (percussive cues).
function synth(notes, totalDurSec) {
  const n = Math.ceil(totalDurSec * SR);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (const note of notes) {
    const {
      freq, start, dur, amp = 0.2,
      attack = 0.4, release = 0.4, // seconds
      detune = 0.0015, harmonic2 = 0.15,
    } = note;
    const s0 = Math.max(0, Math.floor(start * SR));
    const s1 = Math.min(n, Math.floor((start + dur) * SR));
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / SR;
      let env;
      if (t < attack) env = smoothstep(t / attack);
      else if (t > dur - release) env = smoothstep((dur - t) / release);
      else env = 1;
      const time = i / SR;
      const l = Math.sin(2 * Math.PI * freq * (1 - detune) * time)
        + harmonic2 * Math.sin(2 * Math.PI * freq * 2 * (1 - detune) * time);
      const r = Math.sin(2 * Math.PI * freq * (1 + detune) * time)
        + harmonic2 * Math.sin(2 * Math.PI * freq * 2 * (1 + detune) * time);
      left[i] += l * env * amp;
      right[i] += r * env * amp;
    }
  }
  return { left, right };
}

// Gentle feedback echo — adds ambient space without extra dependencies.
function echo(buf, delaySec, feedback, mix) {
  const d = Math.round(delaySec * SR);
  const out = Float32Array.from(buf);
  for (let i = d; i < out.length; i++) {
    out[i] += out[i - d] * feedback * mix;
  }
  return out;
}

function normalize(left, right, peak = 0.9) {
  let max = 0;
  for (let i = 0; i < left.length; i++) {
    max = Math.max(max, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (max === 0) return { left, right };
  const g = peak / max;
  const l2 = new Float32Array(left.length);
  const r2 = new Float32Array(right.length);
  for (let i = 0; i < left.length; i++) {
    l2[i] = left[i] * g;
    r2[i] = right[i] * g;
  }
  return { left: l2, right: r2 };
}

function writeWav(filePath, channels) {
  const numCh = channels.length;
  const n = channels[0].length;
  const blockAlign = numCh * 2;
  const byteRate = SR * blockAlign;
  const dataSize = n * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numCh, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), offset);
      offset += 2;
    }
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, buf);
  console.log(`wrote ${path.relative(process.cwd(), filePath)} (${(buf.length / 1024).toFixed(0)} KB)`);
}

function writeStereo(filePath, left, right) {
  const norm = normalize(left, right);
  writeWav(filePath, [norm.left, norm.right]);
}

function writeMono(filePath, notes, totalDurSec) {
  const { left, right } = synth(notes, totalDurSec);
  const mono = new Float32Array(left.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (left[i] + right[i]) / 2;
  const norm = normalize(mono, mono);
  writeWav(filePath, [norm.left]);
}

// ---------------------------------------------------------------------------
// Background Music — shared I - vi - ii(sus) - V progression in C major pentatonic.
// Each chord holds for CHORD_DUR seconds with a slow breathing swell (attack/release
// both ~30% of the chord length), looping seamlessly since every chord starts and
// ends at silence.
// ---------------------------------------------------------------------------

const CHORD_DUR = 4;
const CHORDS = [
  // I  (C)
  [{ n: 'C2', amp: 0.22 }, { n: 'C3', amp: 0.14 }, { n: 'E3', amp: 0.12 }, { n: 'G3', amp: 0.12 }],
  // vi (Am)
  [{ n: 'A2', amp: 0.20 }, { n: 'A3', amp: 0.13 }, { n: 'C4', amp: 0.11 }, { n: 'E4', amp: 0.11 }],
  // ii(sus) (Dm-sus, pentatonic-safe)
  [{ n: 'D2', amp: 0.20 }, { n: 'D3', amp: 0.13 }, { n: 'A3', amp: 0.11 }, { n: 'D4', amp: 0.11 }],
  // V  (G)
  [{ n: 'G2', amp: 0.20 }, { n: 'G3', amp: 0.13 }, { n: 'D4', amp: 0.11 }, { n: 'G4', amp: 0.11 }],
];

function buildPad() {
  const notes = [];
  CHORDS.forEach((chord, i) => {
    const start = i * CHORD_DUR;
    for (const { n, amp } of chord) {
      notes.push({
        freq: N[n], start, dur: CHORD_DUR, amp,
        attack: CHORD_DUR * 0.3, release: CHORD_DUR * 0.3,
        harmonic2: 0.12,
      });
    }
  });
  return notes;
}

// Quiet plucked arpeggio, one octave above each chord's upper three notes,
// layered on top of the pad for the Session (in-game) Track only.
function buildArpeggio() {
  const notes = [];
  const STEP = 0.5; // eighth-notes at this tempo
  CHORDS.forEach((chord, ci) => {
    const upper = chord.slice(1); // skip the bass note
    const pattern = [0, 1, 2, 1, 0, 1, 2, 1];
    for (let s = 0; s < 8; s++) {
      const { n } = upper[pattern[s]];
      const start = ci * CHORD_DUR + s * STEP;
      notes.push({
        freq: N[n] * 2, start, dur: STEP * 0.9, amp: 0.045,
        attack: 0.01, release: STEP * 0.7,
        harmonic2: 0.3,
      });
    }
  });
  return notes;
}

function generateMusic() {
  const totalDur = CHORD_DUR * CHORDS.length;

  const home = synth(buildPad(), totalDur);
  const homeEchoL = echo(home.left, 0.28, 0.32, 0.5);
  const homeEchoR = echo(home.right, 0.28, 0.32, 0.5);
  writeStereo(path.join(OUT_ROOT, 'music', 'home.wav'), homeEchoL, homeEchoR);

  const game = synth([...buildPad(), ...buildArpeggio()], totalDur);
  const gameEchoL = echo(game.left, 0.28, 0.28, 0.4);
  const gameEchoR = echo(game.right, 0.28, 0.28, 0.4);
  writeStereo(path.join(OUT_ROOT, 'music', 'game.wav'), gameEchoL, gameEchoR);
}

// ---------------------------------------------------------------------------
// Audio Cues — short one-shots, all drawn from the same pentatonic scale
// (metro.md §13 table).
// ---------------------------------------------------------------------------

function generateSfx() {
  const dir = path.join(OUT_ROOT, 'sfx');

  // Resource Delivered: two-note ascending chime.
  writeMono(path.join(dir, 'passenger-delivered.wav'), [
    { freq: N.E5, start: 0, dur: 0.28, amp: 0.4, attack: 0.005, release: 0.24, harmonic2: 0.4 },
    { freq: N.G5, start: 0.09, dur: 0.32, amp: 0.4, attack: 0.005, release: 0.28, harmonic2: 0.4 },
  ], 0.45);

  // Node Spawned: quick two-note pop.
  writeMono(path.join(dir, 'station-spawn.wav'), [
    { freq: N.C5, start: 0, dur: 0.08, amp: 0.22, attack: 0.003, release: 0.06, harmonic2: 0.5 },
    { freq: N.C6, start: 0.03, dur: 0.25, amp: 0.32, attack: 0.003, release: 0.2, harmonic2: 0.5 },
  ], 0.32);

  // Route Committed: single soft pluck.
  writeMono(path.join(dir, 'line-drawn.wav'), [
    { freq: N.G4, start: 0, dur: 0.24, amp: 0.38, attack: 0.005, release: 0.2, harmonic2: 0.22 },
  ], 0.26);

  // Milestone Event: ascending four-note arpeggio with a longer tail.
  writeMono(path.join(dir, 'milestone.wav'), [
    { freq: N.C5, start: 0.00, dur: 0.28, amp: 0.34, attack: 0.005, release: 0.22, harmonic2: 0.35 },
    { freq: N.E5, start: 0.16, dur: 0.28, amp: 0.34, attack: 0.005, release: 0.22, harmonic2: 0.35 },
    { freq: N.G5, start: 0.32, dur: 0.30, amp: 0.34, attack: 0.005, release: 0.24, harmonic2: 0.35 },
    { freq: N.C6, start: 0.48, dur: 0.60, amp: 0.36, attack: 0.005, release: 0.5, harmonic2: 0.35 },
  ], 1.1);

  // Overflow Risk Started: two alternating low tones, gentle rather than alarming.
  writeMono(path.join(dir, 'overflow-risk.wav'), [
    { freq: N.A3, start: 0.00, dur: 0.30, amp: 0.32, attack: 0.02, release: 0.2, harmonic2: 0.18 },
    { freq: N.G3, start: 0.34, dur: 0.32, amp: 0.32, attack: 0.02, release: 0.22, harmonic2: 0.18 },
  ], 0.7);

  // Game Over: descending three-note cadence, long release on the last note.
  writeMono(path.join(dir, 'game-over.wav'), [
    { freq: N.G5, start: 0.00, dur: 0.34, amp: 0.32, attack: 0.005, release: 0.26, harmonic2: 0.3 },
    { freq: N.E5, start: 0.32, dur: 0.34, amp: 0.32, attack: 0.005, release: 0.26, harmonic2: 0.3 },
    { freq: N.C5, start: 0.64, dur: 0.65, amp: 0.34, attack: 0.005, release: 0.55, harmonic2: 0.3 },
  ], 1.35);
}

generateMusic();
generateSfx();
