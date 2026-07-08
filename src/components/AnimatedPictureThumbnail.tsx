import { useEffect, useRef } from 'react';
import { CONFIG } from '../config/gameConfig';
import { getPictureCanvas, buildPictureTrains, buildPictureStations, drawAnimatedPictureFrame } from '../render/renderPicture';
import { getPictureForIndex } from '../logic/pictureContent';

interface AnimatedPictureThumbnailProps {
  index: number;
  revealedTileCount: number;
  width: number;
  height: number;
}

// Animated presentation of a Picture (themes/metro.md §9.3.2): simulated
// trains run along the city's real lines, visible only within already-revealed
// tiles. Used for the home screen hero, the Game-Over Reveal, and the
// Collectibles Screen detail view — the grid of thumbnails elsewhere stays
// static (see PictureThumbnail) for performance with many Complete Pictures
// on screen at once.
export function AnimatedPictureThumbnail({ index, revealedTileCount, width, height }: AnimatedPictureThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealedRef = useRef(revealedTileCount);

  useEffect(() => {
    revealedRef.current = revealedTileCount;
  }, [revealedTileCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const city = getPictureForIndex(index);
    const fullCanvas = getPictureCanvas(index);
    const trains = buildPictureTrains(city);
    const stations = buildPictureStations(city, performance.now());
    let raf = 0;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      drawAnimatedPictureFrame(ctx, 0, 0, width, height, fullCanvas, trains, stations, now, dt, revealedRef.current);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // revealedTileCount is read every frame via revealedRef, not restarted here,
    // so tile pop-in during the Game-Over count-up doesn't reset train positions.
  }, [index, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 6, display: 'block', background: CONFIG.PICTURE_BG_COLOR }}
    />
  );
}
