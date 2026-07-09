import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config/gameConfig';
import { traceShapePath } from '../render/shapePaths';
import { buildWalkablePath, pointAt, stepWalker, type WalkablePath } from '../logic/lineWalker';
import { CollectiblesScreen } from './CollectiblesScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import type { LeaderboardIdentity } from '../firebase/leaderboard';
import { remoteConfigReady } from '../firebase/remoteConfig';
import type { StationShape } from '../types/game';

interface HomeScreenProps {
  onPlay: () => void;
  bestWeeksSurvived: number;
  collectionSize: number;
  currentPictureProgress: number;
  leaderboardIdentity: LeaderboardIdentity | null; // metro.md §9.6 — only non-null once available
}

const BG = '#f5f0e8';
const INK = '#2d2d2d';
const WATER = '#d9e8f0';
const SHAPE_CYCLE: StationShape[] = ['circle', 'triangle', 'square', 'star', 'hexagon', 'plus'];

const TRAIN_SPEED = 55;
const DWELL_MS = 700;
const DRAW_IN_MS = 1000;
const DRAW_IN_STAGGER_MS = 300;
const MAX_WAITING = 3;
const TRAIN_SEATS = 4;

interface AmbientStation {
  dist: number;
  x: number;
  y: number;
  shape: StationShape;
  appearAt: number | null;
  waiting: StationShape[];
  nextSpawnAt: number;
}

interface AmbientTrain {
  dist: number;
  dir: 1 | -1;
  dwellUntil: number;
  riders: StationShape[];
}

interface AmbientLine {
  color: string;
  path: WalkablePath;
  stations: AmbientStation[];
  trains: AmbientTrain[];
  revealStart: number;
}

interface Scene {
  w: number;
  h: number;
  lines: AmbientLine[];
  water: { x: number; y: number }[];
  waterWidth: number;
}

// Octilinear route builder: each move is [dirX, dirY, len] with dir components in
// {-1,0,1}; len applies per-axis, so diagonal moves are exact 45°.
function route(startX: number, startY: number, moves: [number, number, number][]): { x: number; y: number }[] {
  const pts = [{ x: startX, y: startY }];
  for (const [dx, dy, len] of moves) {
    const prev = pts[pts.length - 1];
    pts.push({ x: prev.x + dx * len, y: prev.y + dy * len });
  }
  return pts;
}

function buildLine(
  color: string,
  pts: { x: number; y: number }[],
  stationWaypoints: number[],
  shapeOffset: number,
  revealStart: number,
  trainCount: number,
): AmbientLine {
  const path = buildWalkablePath(pts, stationWaypoints);
  const stations: AmbientStation[] = stationWaypoints.map((wp, i) => ({
    dist: path.cum[wp],
    x: pts[wp].x,
    y: pts[wp].y,
    shape: SHAPE_CYCLE[(shapeOffset + i) % SHAPE_CYCLE.length],
    appearAt: null,
    waiting: [],
    nextSpawnAt: revealStart + 1500 + Math.random() * 3000,
  }));
  const trains: AmbientTrain[] = [];
  for (let i = 0; i < trainCount; i++) {
    trains.push({
      dist: (path.total * (i + 1)) / (trainCount + 1),
      dir: i % 2 === 0 ? 1 : -1,
      dwellUntil: 0,
      riders: [],
    });
  }
  return { color, path, stations, trains, revealStart };
}

function buildScene(w: number, h: number, now: number): Scene {
  const m = Math.min(w, h);
  const [red, blue, green, orange] = CONFIG.LINE_COLORS;
  const lines = [
    buildLine(red, route(-60, h * 0.7, [
      [1, 0, w * 0.24], [1, -1, m * 0.13], [1, 0, w * 0.18], [1, -1, m * 0.11], [1, 0, w * 0.55],
    ]), [1, 2, 3, 4], 0, now, 2),
    buildLine(blue, route(w * 0.3, -60, [
      [0, 1, h * 0.24], [-1, 1, m * 0.13], [0, 1, h * 0.18], [1, 1, m * 0.15], [0, 1, h * 0.5],
    ]), [1, 2, 3, 4], 2, now + DRAW_IN_STAGGER_MS, 1),
    buildLine(green, route(w * 0.09, h + 60, [
      [0, -1, h * 0.2], [1, -1, m * 0.16], [0, -1, h * 0.13], [1, -1, m * 0.15], [0, -1, h * 0.5],
    ]), [1, 2, 3, 4], 4, now + DRAW_IN_STAGGER_MS * 2, 1),
    buildLine(orange, route(-60, h * 0.22, [
      [1, 0, w * 0.3], [1, 1, m * 0.09], [1, 0, w * 0.24], [1, -1, m * 0.1], [1, 0, w * 0.5],
    ]), [1, 2, 3, 4], 1, now + DRAW_IN_STAGGER_MS * 3, 2),
  ];
  return {
    w,
    h,
    lines,
    water: route(w * 0.82, -80, [[0, 1, h * 0.25], [-1, 1, m * 0.45], [0, 1, h * 0.6]]),
    waterWidth: m * 0.13,
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function updateTrain(line: AmbientLine, train: AmbientTrain, now: number, dt: number): void {
  if (now < line.revealStart + DRAW_IN_MS) return;
  const stopDist = stepWalker(line.path, train, now, dt, TRAIN_SPEED, DWELL_MS);
  if (stopDist === null) return;
  const stopAt = line.stations.find(s => s.dist === stopDist);
  if (!stopAt) return;
  train.riders = train.riders.filter(() => Math.random() > 0.5);
  while (stopAt.waiting.length > 0 && train.riders.length < TRAIN_SEATS) {
    train.riders.push(stopAt.waiting.shift()!);
  }
  stopAt.waiting = [];
}

function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, now: number, dt: number): void {
  const { w, h } = scene;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = WATER;
  ctx.lineWidth = scene.waterWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  scene.water.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  for (const line of scene.lines) {
    const revealT = Math.max(0, Math.min(1, (now - line.revealStart) / DRAW_IN_MS));
    const revealLen = easeOutCubic(revealT) * line.path.total;
    if (revealLen <= 0) continue;

    ctx.strokeStyle = line.color;
    ctx.lineWidth = CONFIG.LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([revealLen, 1e6]);
    ctx.beginPath();
    line.path.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);

    for (const s of line.stations) {
      if (s.appearAt === null && revealLen >= s.dist) s.appearAt = now;
    }
  }

  scene.lines.forEach((line, li) => {
    line.stations.forEach((s, si) => {
      if (s.appearAt === null) return;

      if (s.waiting.length < MAX_WAITING && now >= s.nextSpawnAt) {
        s.waiting.push(SHAPE_CYCLE[Math.floor(Math.random() * SHAPE_CYCLE.length)]);
        s.nextSpawnAt = now + 2500 + Math.random() * 2500;
      }

      const popT = Math.min(1, (now - s.appearAt) / 250);
      const pulse = popT >= 1 ? 1 + 0.05 * Math.sin(now / 600 + li * 2.1 + si * 1.3) : easeOutBack(popT);
      const r = 9 * pulse;

      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      traceShapePath(ctx, s.x, s.y, s.shape, r);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3a3a3a';
      s.waiting.forEach((shape, wi) => {
        traceShapePath(ctx, s.x + 16 + wi * 11, s.y - 14, shape, 4);
        ctx.fill();
      });
    });
  });

  for (const line of scene.lines) {
    for (const train of line.trains) {
      updateTrain(line, train, now, dt);
      if (now < line.revealStart + DRAW_IN_MS) continue;
      const p = pointAt(line.path, train.dist);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = line.color;
      ctx.beginPath();
      ctx.roundRect(-13, -6.5, 26, 13, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      train.riders.forEach((shape, ri) => {
        traceShapePath(ctx, -8 + ri * 5.5, 0, shape, 2.6);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  const m = Math.min(w, h);
  const grad = ctx.createRadialGradient(w / 2, h * 0.48, m * 0.05, w / 2, h * 0.48, m);
  grad.addColorStop(0, 'rgba(245, 240, 232, 0.94)');
  grad.addColorStop(0.5, 'rgba(245, 240, 232, 0.7)');
  grad.addColorStop(1, 'rgba(245, 240, 232, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// A small stacked-squares "collection" glyph — the icon-only View Collectibles
// control overlaid on the Picture thumbnail's corner (home_screen.md § Content).
function CollectiblesIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13">
      <rect x="1" y="4" width="8" height="8" rx="1.5" fill="none" stroke={color} strokeWidth="1.3" />
      <rect x="4" y="1" width="8" height="8" rx="1.5" fill="#fff" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

export function HomeScreen({
  onPlay, bestWeeksSurvived, collectionSize, currentPictureProgress, leaderboardIdentity,
}: HomeScreenProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCollectibles, setShowCollectibles] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Remote Config Overrides (themes/metro.md §5.1): the fetch itself started in the
  // background as soon as remoteConfig.ts was first imported — nothing here blocks on
  // it unless the player clicks Play before it resolves (handlePlay below).
  const [configReady, setConfigReady] = useState(false);
  const [awaitingPlay, setAwaitingPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    remoteConfigReady.then(() => {
      if (!cancelled) setConfigReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (awaitingPlay && configReady) onPlay();
  }, [awaitingPlay, configReady, onPlay]);

  function handlePlay() {
    if (configReady) {
      onPlay();
    } else {
      setAwaitingPlay(true);
    }
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    let scene: Scene | null = null;
    let raf = 0;
    let lastTime = 0;

    function resize() {
      if (!wrapper || !canvas) return;
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scene = buildScene(w, h, performance.now() + 400);
    }

    function loop(now: number) {
      const dt = Math.min(50, lastTime === 0 ? 16 : now - lastTime);
      lastTime = now;
      const ctx = canvas?.getContext('2d');
      if (ctx && scene) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene(ctx, scene, now, dt);
      }
      raf = requestAnimationFrame(loop);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const [red, blue, green] = CONFIG.LINE_COLORS;
  const fontStack = "'Avenir Next', 'Futura', 'Trebuchet MS', 'Segoe UI', sans-serif";

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0, background: BG, overflow: 'hidden', zIndex: 20 }}>
      <style>{`
        @keyframes mmFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes mmPop {
          0% { opacity: 0; transform: scale(0); }
          70% { transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes mmPulseRing {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes mmSpin {
          to { transform: rotate(360deg); }
        }
        .mm-play {
          transition: transform 0.15s ease;
        }
        .mm-play:hover { transform: scale(1.07); }
        .mm-play:active { transform: scale(0.94); }
      `}</style>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: fontStack,
          fontSize: 'clamp(34px, 10vmin, 58px)',
          letterSpacing: '0.14em',
          color: INK,
          whiteSpace: 'nowrap',
          animation: 'mmFadeUp 0.7s ease-out both',
        }}>
          <span style={{ fontWeight: 400 }}>TRAIN</span>
          <span style={{ fontWeight: 800, marginLeft: '0.35em' }}>PUZZLE</span>
        </h1>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '18px 0 14px' }}>
          <div style={{
            width: 13, height: 13, borderRadius: '50%', background: red,
            animation: 'mmPop 0.45s ease-out 0.5s both',
          }} />
          <div style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `14px solid ${blue}`,
            animation: 'mmPop 0.45s ease-out 0.65s both',
          }} />
          <div style={{
            width: 12, height: 12, background: green,
            animation: 'mmPop 0.45s ease-out 0.8s both',
          }} />
        </div>

        <p style={{
          margin: '0 0 34px',
          fontFamily: fontStack,
          fontSize: 15,
          letterSpacing: '0.04em',
          color: '#6b6459',
          animation: 'mmFadeUp 0.7s ease-out 0.35s both',
        }}>
          Connect the stations. Keep the city moving.
        </p>

        <div style={{ position: 'relative', pointerEvents: 'auto', animation: 'mmFadeUp 0.7s ease-out 0.55s both' }}>
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid ${red}`,
            animation: 'mmPulseRing 2s ease-out infinite',
            pointerEvents: 'none',
          }} />
          <button
            className="mm-play"
            onClick={handlePlay}
            aria-label="Play"
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              border: 'none',
              background: red,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(231, 76, 60, 0.4)',
            }}
          >
            {awaitingPlay && !configReady ? (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff',
                animation: 'mmSpin 0.8s linear infinite',
              }} />
            ) : (
              <div style={{
                width: 0,
                height: 0,
                marginLeft: 6,
                borderTop: '15px solid transparent',
                borderBottom: '15px solid transparent',
                borderLeft: '24px solid #fff',
              }} />
            )}
          </button>
        </div>

        <div style={{
          marginTop: 14,
          fontFamily: fontStack,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.3em',
          color: INK,
          animation: 'mmFadeUp 0.7s ease-out 0.7s both',
        }}>
          {awaitingPlay && !configReady ? 'STARTING…' : 'PLAY'}
        </div>

        {leaderboardIdentity && (
          <div style={{
            marginTop: 30,
            pointerEvents: 'auto',
            animation: 'mmFadeUp 0.7s ease-out 0.85s both',
          }}>
            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                background: 'none',
                border: `1px solid ${INK}`,
                borderRadius: 6,
                padding: '5px 14px',
                fontSize: 12,
                fontFamily: fontStack,
                color: INK,
                cursor: 'pointer',
              }}
            >
              View Leaderboard
            </button>
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        top: 18,
        right: 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'auto',
        animation: 'mmFadeUp 0.7s ease-out 0.85s both',
      }}>
        {bestWeeksSurvived > 0 && (
          <div style={{ fontFamily: fontStack, fontSize: 13, color: '#6b6459' }}>
            Best: Week {Math.floor(bestWeeksSurvived)}
          </div>
        )}
        <button
          onClick={() => setShowCollectibles(true)}
          aria-label="View Collectibles"
          title="View Collectibles"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#fff',
            border: `1px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <CollectiblesIcon color={INK} />
        </button>
      </div>

      {showCollectibles && (
        <CollectiblesScreen
          collectionSize={collectionSize}
          currentPictureProgress={currentPictureProgress}
          onClose={() => setShowCollectibles(false)}
        />
      )}

      {showLeaderboard && leaderboardIdentity && (
        <LeaderboardScreen identity={leaderboardIdentity} onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
  );
}
