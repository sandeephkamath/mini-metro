import { useState } from 'react';
import type { RevealSegment } from '../logic/collectibles';
import type { LeaderboardResult } from '../hooks/useLeaderboard';
import type { StationShape } from '../types/game';
import { PictureReveal } from './PictureReveal';
import { ConfirmModal } from './ConfirmModal';
import { CONFIG } from '../config/gameConfig';

interface GameOverScreenProps {
  score: number;
  weekNumber: number;
  bestWeeksSurvived: number;
  isNewBest: boolean;
  leaderboardResult: LeaderboardResult | null;
  pictureRevealSegments: RevealSegment[] | null;
  overflowStationShape: StationShape | null;
  onRestart: () => void;
  onContinueCreative: () => void;
}

function overflowMessage(shape: StationShape | null): string {
  if (!shape) return 'A station overflowed.';
  return `The ${shape} station overflowed.`;
}

export function GameOverScreen({
  score, weekNumber, bestWeeksSurvived, isNewBest, leaderboardResult, pictureRevealSegments, overflowStationShape,
  onRestart, onContinueCreative,
}: GameOverScreenProps) {
  // Guards against an accidental tap on the small corner close icon discarding this
  // summary (score, Best Weeks, Leaderboard rank, Picture reveal) before it's been
  // read — themes/metro.md §8.
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      zIndex: 20,
    }}>
      <div style={{ position: 'relative', maxHeight: '90vh' }}>
        <button
          onClick={() => setConfirmingRestart(true)}
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
            border: `1px solid ${CONFIG.UI_INK_COLOR}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            color: CONFIG.UI_INK_COLOR,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            zIndex: 1,
          }}
        >
          ×
        </button>
        <div style={{
          background: CONFIG.UI_BG_COLOR,
          borderRadius: '12px',
          padding: '26px 48px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          textAlign: 'center',
          minWidth: 280,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
          <h2 style={{ margin: '0 0 4px', color: CONFIG.UI_PRIMARY_COLOR, fontFamily: 'monospace', fontSize: '1.8rem' }}>Game over</h2>
          <p style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, margin: '0 0 10px' }}>{overflowMessage(overflowStationShape)}</p>
          {/* Side by side rather than stacked: on a landscape phone (this game's
              required orientation, §6.1) there's ample spare width but little spare
              height, and the Picture Reveal is the tallest single element here — a
              single centered column made this card scroll internally on short
              viewports (B27) even after fixing the worse invisible-clipping version
              of that bug. Wraps back to stacked/centered if either column runs out
              of room, e.g. a narrow desktop window. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 4, color: CONFIG.UI_INK_COLOR }}>{score}</div>
              <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, marginBottom: 8 }}>passengers delivered</div>
              {isNewBest ? (
                <div style={{ color: CONFIG.LINE_COLORS[2], fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>
                  New best — Week {weekNumber}
                </div>
              ) : (
                <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, fontSize: '0.85rem', marginBottom: 8 }}>
                  Reached Week {weekNumber} · Best: Week {Math.floor(bestWeeksSurvived)}
                </div>
              )}
              {leaderboardResult && (
                <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, fontSize: '0.8rem', marginBottom: 8 }}>
                  #{leaderboardResult.rank.toLocaleString()}
                  {leaderboardResult.totalPlayers !== null && ` of ${leaderboardResult.totalPlayers.toLocaleString()} players`}
                </div>
              )}
            </div>
            {pictureRevealSegments && <PictureReveal segments={pictureRevealSegments} />}
          </div>
          <button
            onClick={onContinueCreative}
            style={{
              marginTop: 10,
              background: 'transparent',
              color: CONFIG.UI_INK_COLOR,
              border: `1px solid ${CONFIG.UI_INK_COLOR}`,
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Continue in Creative Mode
          </button>
        </div>
      </div>
      {confirmingRestart && (
        <ConfirmModal
          message="Return to home screen?"
          confirmLabel="Return"
          onConfirm={onRestart}
          onCancel={() => setConfirmingRestart(false)}
        />
      )}
    </div>
  );
}
