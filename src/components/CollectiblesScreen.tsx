import { CONFIG } from '../config/gameConfig';
import { getRevealedTileCount } from '../logic/collectibles';
import { PictureThumbnail } from './PictureThumbnail';

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

const UPCOMING_PREVIEW_COUNT = 3;

// Modal overlay on top of the home screen (home_screen.md § Collectibles Screen):
// every Complete Picture (oldest first), the Current Picture at its live reveal
// state, then a short locked lookahead of upcoming Pictures.
export function CollectiblesScreen({ collectionSize, currentPictureProgress, onClose }: CollectiblesScreenProps) {
  const currentIndex = collectionSize + 1;
  const currentTiles = getRevealedTileCount(currentIndex, currentPictureProgress);
  const completeIndices = Array.from({ length: collectionSize }, (_, i) => i + 1);
  const upcomingIndices = Array.from({ length: UPCOMING_PREVIEW_COUNT }, (_, i) => currentIndex + 1 + i);

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
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '28px 32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxWidth: 620,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ margin: '0 0 16px', fontFamily: 'monospace', textAlign: 'center' }}>Collectibles</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {completeIndices.map(index => (
            <PictureThumbnail key={index} index={index} revealedTileCount={CONFIG.PICTURE_TILE_COUNT} width={TILE_W} height={TILE_H} />
          ))}
          <PictureThumbnail index={currentIndex} revealedTileCount={currentTiles} width={TILE_W} height={TILE_H} />
          {upcomingIndices.map(index => <LockedThumbnail key={index} />)}
        </div>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 13, margin: '10px 0 20px', fontFamily: 'monospace' }}>
          ...and more
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 28px',
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
