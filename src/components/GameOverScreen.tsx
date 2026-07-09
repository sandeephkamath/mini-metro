import type { RevealSegment } from '../logic/collectibles';
import type { LeaderboardResult } from '../hooks/useLeaderboard';
import { PictureReveal } from './PictureReveal';

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
        background: '#fff',
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
        <h2 style={{ margin: '0 0 4px', color: '#e74c3c', fontFamily: 'monospace', fontSize: '1.8rem' }}>Game over</h2>
        <p style={{ color: '#666', margin: '0 0 16px' }}>A station overflowed.</p>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 4 }}>{score}</div>
        <div style={{ color: '#888', marginBottom: 12 }}>passengers delivered</div>
        {isNewBest ? (
          <div style={{ color: '#e67e22', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>
            New best — Week {weekNumber}
          </div>
        ) : (
          <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 8 }}>
            Reached Week {weekNumber} · Best: Week {Math.floor(bestWeeksSurvived)}
          </div>
        )}
        {leaderboardResult && (
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>
            #{leaderboardResult.rank.toLocaleString()}
            {leaderboardResult.totalPlayers !== null && ` of ${leaderboardResult.totalPlayers.toLocaleString()} players`}
          </div>
        )}
        {pictureRevealSegments && <PictureReveal segments={pictureRevealSegments} />}
      </div>
    </div>
  );
}
