import { useState } from 'react';
import { CONFIG } from '../config/gameConfig';
import { getRevealedTileCount } from '../logic/collectibles';
import { getPictureForIndex } from '../logic/pictureContent';
import { PictureThumbnail } from './PictureThumbnail';
import { AnimatedPictureThumbnail } from './AnimatedPictureThumbnail';

interface CollectiblesScreenProps {
  collectionSize: number;
  currentPictureProgress: number;
  onClose: () => void;
}

const TILE_W = 130;
const TILE_H = 104; // matches the 5:4 Picture aspect ratio

// Generic "???" placeholder for an upcoming, not-yet-current Picture — the
// spec-endorsed safe default until a real rendered Picture informs a nicer
// blurred/silhouette treatment (home_screen.md § Collectibles Screen).
function LockedThumbnail() {
  return (
    <div style={{
      width: TILE_W,
      height: TILE_H,
      borderRadius: 6,
      background: '#e8e2d5',
      border: '2px dashed #b8b0a0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#a89e8c',
      fontFamily: 'monospace',
      fontSize: 22,
      fontWeight: 'bold',
      letterSpacing: '0.1em',
    }}>
      ???
    </div>
  );
}

// The Picture's real-world name (metro.md §9.3) — shown for Complete/Current
// entries only; locked placeholders use LockedThumbnail above instead, which
// deliberately reveals nothing about what's next.
function PictureName({ index }: { index: number }) {
  return (
    <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'monospace', color: '#666' }}>
      {getPictureForIndex(index).name}
    </div>
  );
}

const UPCOMING_PREVIEW_COUNT = 3;

// Modal overlay on top of the home screen (home_screen.md § Collectibles Screen):
// every Complete Picture (oldest first), the Current Picture at its live reveal
// state, then a short locked lookahead of upcoming Pictures.
const DETAIL_W = 400;
const DETAIL_H = 320; // matches PICTURE_RENDER_WIDTH/HEIGHT's 5:4 aspect

export function CollectiblesScreen({ collectionSize, currentPictureProgress, onClose }: CollectiblesScreenProps) {
  const currentIndex = collectionSize + 1;
  const currentTiles = getRevealedTileCount(currentIndex, currentPictureProgress);
  const completeIndices = Array.from({ length: collectionSize }, (_, i) => i + 1);
  const upcomingIndices = Array.from({ length: UPCOMING_PREVIEW_COUNT }, (_, i) => currentIndex + 1 + i);

  // Picture Detail View (home_screen.md § Collectibles Screen): tapping a
  // Complete or Current thumbnail opens it large, animated (metro.md §9.3.2).
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const detailTiles = detailIndex === currentIndex ? currentTiles : CONFIG.PICTURE_TILE_COUNT;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)',
      zIndex: 25,
    }}>
      <div style={{ position: 'relative', maxWidth: 620 }}>
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#fff',
            border: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            color: '#333',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            zIndex: 1,
          }}
        >
          ×
        </button>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '28px 32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}>
        <h2 style={{ margin: '0 0 16px', fontFamily: 'monospace', textAlign: 'center' }}>Collectibles</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {completeIndices.map(index => (
            <div key={index} onClick={() => setDetailIndex(index)} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <PictureThumbnail index={index} revealedTileCount={CONFIG.PICTURE_TILE_COUNT} width={TILE_W} height={TILE_H} />
              <PictureName index={index} />
            </div>
          ))}
          <div onClick={() => setDetailIndex(currentIndex)} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <PictureThumbnail index={currentIndex} revealedTileCount={currentTiles} width={TILE_W} height={TILE_H} />
            <PictureName index={currentIndex} />
          </div>
          {upcomingIndices.map(index => <LockedThumbnail key={index} />)}
        </div>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 13, margin: '10px 0 4px', fontFamily: 'monospace' }}>
          ...and more
        </div>
        </div>
      </div>

      {detailIndex !== null && (
        <div
          onClick={() => setDetailIndex(null)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            zIndex: 26,
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              textAlign: 'center',
              background: '#fff',
              borderRadius: 12,
              padding: '20px 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <button
              onClick={() => setDetailIndex(null)}
              aria-label="Close"
              title="Close"
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#fff',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                color: '#333',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              ×
            </button>
            <div style={{ marginBottom: 10, fontSize: 18, fontFamily: 'monospace', color: '#333' }}>
              {getPictureForIndex(detailIndex).name}
            </div>
            <AnimatedPictureThumbnail index={detailIndex} revealedTileCount={detailTiles} width={DETAIL_W} height={DETAIL_H} />
          </div>
        </div>
      )}
    </div>
  );
}
