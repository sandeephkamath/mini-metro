import type { RevealSegment } from '../logic/collectibles';
import type { LeaderboardResult } from '../hooks/useLeaderboard';
import { PictureReveal } from './PictureReveal';
import { CONFIG } from '../config/gameConfig';

interface GameOverScreenProps {
  score: number;
  weekNumber: number;
  bestWeeksSurvived: number;
  isNewBest: boolean;
  leaderboardResult: LeaderboardResult | null;
  pictureRevealSegments: RevealSegment[] | null;
  onRestart: () => void;
}

export function GameOverScreen({
  score, weekNumber, bestWeeksSurvived, isNewBest, leaderboardResult, pictureRevealSegments, onRestart,
}: GameOverScreenProps) {
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
      <div style={{
        position: 'relative',
        background: CONFIG.UI_BG_COLOR,
        borderRadius: '12px',
        padding: '40px 48px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
        minWidth: 280,
      }}>
        <button
          onClick={onRestart}
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
          }}
        >
          ×
        </button>
        <h2 style={{ margin: '0 0 4px', color: CONFIG.UI_PRIMARY_COLOR, fontFamily: 'monospace', fontSize: '1.8rem' }}>Game over</h2>
        <p style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, margin: '0 0 16px' }}>A station overflowed.</p>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 4, color: CONFIG.UI_INK_COLOR }}>{score}</div>
        <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, marginBottom: 12 }}>passengers delivered</div>
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
        {pictureRevealSegments && <PictureReveal segments={pictureRevealSegments} />}
      </div>
    </div>
  );
}
