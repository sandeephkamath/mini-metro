import type { RevealSegment } from '../logic/collectibles';
import type { LeaderboardResult } from '../hooks/useLeaderboard';
import { PictureReveal } from './PictureReveal';

interface GameOverScreenProps {
  score: number;
  level: number;
  weekNumber: number;
  bestWeeksSurvived: number;
  isNewBest: boolean;
  leaderboardResult: LeaderboardResult | null;
  pictureRevealSegments: RevealSegment[] | null;
  onRestart: () => void;
}

export function GameOverScreen({
  score, level, weekNumber, bestWeeksSurvived, isNewBest, leaderboardResult, pictureRevealSegments, onRestart,
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
        background: '#fff',
        borderRadius: '12px',
        padding: '40px 48px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
        minWidth: 280,
      }}>
        <h2 style={{ margin: '0 0 4px', color: '#e74c3c', fontFamily: 'monospace', fontSize: '1.8rem' }}>Game Over</h2>
        <p style={{ color: '#666', margin: '0 0 16px' }}>A station overflowed</p>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>{score}</div>
        <div style={{ color: '#888', marginBottom: 8 }}>passengers delivered · Level {level}</div>
        {isNewBest ? (
          <div style={{ color: '#e67e22', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>
            New Best! Week {weekNumber}
          </div>
        ) : (
          <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 8 }}>
            You survived to Week {weekNumber} — Personal Best is Week {Math.floor(bestWeeksSurvived)}
          </div>
        )}
        {leaderboardResult && (
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>
            #{leaderboardResult.rank.toLocaleString()}
            {leaderboardResult.totalPlayers !== null && ` of ${leaderboardResult.totalPlayers.toLocaleString()} players`}
          </div>
        )}
        {pictureRevealSegments && <PictureReveal segments={pictureRevealSegments} />}
        <button
          onClick={onRestart}
          style={{
            background: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            fontSize: '16px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
