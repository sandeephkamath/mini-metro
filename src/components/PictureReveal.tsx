import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config/gameConfig';
import type { RevealSegment } from '../logic/collectibles';
import { getRevealedTileCount } from '../logic/collectibles';
import { getPictureCanvas, buildPictureTrains, drawAnimatedPictureFrame } from '../render/renderPicture';
import { getPictureForIndex } from '../logic/pictureContent';

interface PictureRevealProps {
  segments: RevealSegment[];
}

const THUMB_W = 200;
const THUMB_H = 160; // matches the 5:4 aspect of PICTURE_RENDER_WIDTH/HEIGHT
const COMPLETE_PAUSE_MS = 700; // beat on "Picture Complete!" before advancing to the next segment

// Game-Over Reveal (themes/metro.md §9.4): counts up from this session's starting
// percentage to its ending percentage for the current Picture, one segment per
// Picture the session's contribution spans (a strong session can complete several
// in a row, each getting its own count-up + tile pop-in before the next begins).
export function PictureReveal({ segments }: PictureRevealProps) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(segments[0]?.startProgress ?? 0);
  const [justCompleted, setJustCompleted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const segment = segments[segmentIndex];

  // Skip a zero-length segment (a session landing exactly on a completion boundary
  // produces a trailing startProgress===endProgress segment for the next Picture)
  // unless it's the only one there is.
  useEffect(() => {
    if (segment && segment.startProgress === segment.endProgress && segmentIndex < segments.length - 1) {
      setSegmentIndex(i => i + 1);
    }
  }, [segment, segmentIndex, segments.length]);

  useEffect(() => {
    if (!segment) return;
    setJustCompleted(false);
    setDisplayProgress(segment.startProgress);
    const start = performance.now();
    let raf = 0;
    let advanceTimer = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / CONFIG.PICTURE_REVEAL_ANIM_MS);
      setDisplayProgress(segment.startProgress + (segment.endProgress - segment.startProgress) * t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (segment.completed) {
        setJustCompleted(true);
        if (segmentIndex < segments.length - 1) {
          advanceTimer = window.setTimeout(() => setSegmentIndex(i => i + 1), COMPLETE_PAUSE_MS);
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(advanceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex]);

  const displayProgressRef = useRef(displayProgress);
  useEffect(() => {
    displayProgressRef.current = displayProgress;
  }, [displayProgress]);

  // Runs its own RAF loop (themes/metro.md §9.3.2) rather than redrawing only
  // when displayProgress changes, so trains keep moving even once the
  // count-up settles at its final percentage.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segment) return;
    const index = segment.index;
    const fullCanvas = getPictureCanvas(index);
    const trains = buildPictureTrains(getPictureForIndex(index));
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      const tiles = getRevealedTileCount(index, displayProgressRef.current);
      drawAnimatedPictureFrame(ctx, 0, 0, canvas!.width, canvas!.height, fullCanvas, trains, now, dt, tiles);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [segment]);

  if (!segment) return null;

  const percent = Math.round((displayProgress / segment.required) * 100);
  const totalContribution = segments.reduce((sum, s) => sum + (s.endProgress - s.startProgress), 0);
  const contributionLabel = Math.round(totalContribution * 10) / 10;

  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      <canvas
        ref={canvasRef}
        width={THUMB_W}
        height={THUMB_H}
        style={{ borderRadius: 8, display: 'block', margin: '0 auto 8px', background: CONFIG.PICTURE_BG_COLOR }}
      />
      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{percent}% revealed</div>
      <div style={{ color: '#999', fontSize: '0.85rem' }}>+{contributionLabel} weeks</div>
      {justCompleted && (
        <div style={{ color: '#2ecc71', fontWeight: 'bold', marginTop: 4 }}>Picture Complete!</div>
      )}
    </div>
  );
}
