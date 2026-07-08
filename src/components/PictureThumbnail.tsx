import { useEffect, useRef } from 'react';
import { CONFIG } from '../config/gameConfig';
import { getPictureCanvas, drawRevealedPicture } from '../render/renderPicture';

interface PictureThumbnailProps {
  index: number;
  revealedTileCount: number;
  width: number;
  height: number;
}

// A static (non-animated) partially- or fully-revealed Picture — used by the
// Home Screen's current-Picture thumbnail and the Collectibles Screen's
// Complete/Current entries (themes/metro.md §9.3, home_screen.md).
export function PictureThumbnail({ index, revealedTileCount, width, height }: PictureThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRevealedPicture(ctx, 0, 0, canvas.width, canvas.height, getPictureCanvas(index), revealedTileCount);
  }, [index, revealedTileCount, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 6, display: 'block', background: CONFIG.PICTURE_BG_COLOR }}
    />
  );
}
