import { useEffect, useState } from 'react';
import { CONFIG } from '../config/gameConfig';
import type { LeaderboardEntry, LeaderboardIdentity } from '../leaderboard/client';
import { fetchLeaderboardTopN, fetchOwnEntry, fetchOwnRank } from '../leaderboard/client';

interface LeaderboardScreenProps {
  identity: LeaderboardIdentity;
  onClose: () => void;
}

type LoadState = 'loading' | 'error' | 'ready';

// Modal overlay on top of the home screen (home_screen.md § Leaderboard) — a live
// ranked Top N plus the player's own rank, pinned below if they're outside the list.
export function LeaderboardScreen({ identity, onClose }: LeaderboardScreenProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [topN, setTopN] = useState<LeaderboardEntry[]>([]);
  const [ownRank, setOwnRank] = useState<number | null>(null);
  const [ownEntry, setOwnEntry] = useState<LeaderboardEntry | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const [top, own] = await Promise.all([
          fetchLeaderboardTopN(CONFIG.LEADERBOARD_TOP_N),
          fetchOwnEntry(identity.uid),
        ]);
        const rank = own ? await fetchOwnRank(own.weeksSurvived) : null;
        if (cancelled) return;
        setTopN(top);
        setOwnEntry(own);
        setOwnRank(rank);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [identity.uid, attempt]);

  const ownInTopN = ownEntry ? topN.some(e => e.uid === ownEntry.uid) : false;

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
        background: CONFIG.UI_BG_COLOR,
        borderRadius: 12,
        padding: '28px 32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: 360,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ margin: '0 0 16px', fontFamily: 'monospace', textAlign: 'center', color: CONFIG.UI_INK_COLOR }}>Leaderboard</h2>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', color: CONFIG.UI_MUTED_TEXT_COLOR, fontFamily: 'monospace', padding: '20px 0' }}>Loading…</div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', fontFamily: 'monospace', padding: '20px 0' }}>
            <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, marginBottom: 12 }}>Couldn't load the Leaderboard.</div>
            <button
              onClick={() => setAttempt(a => a + 1)}
              style={{
                background: CONFIG.UI_PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {state === 'ready' && (
          <div style={{ overflowY: 'auto', fontFamily: 'monospace', fontSize: 13, color: CONFIG.UI_INK_COLOR }}>
            {topN.length === 0 && (
              <div style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, textAlign: 'center', padding: '20px 0' }}>No scores yet — be the first!</div>
            )}
            {topN.map((entry, i) => (
              <div
                key={entry.uid}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 4px',
                  background: entry.uid === identity.uid ? 'rgba(231, 76, 60, 0.12)' : 'transparent',
                  borderRadius: 4,
                }}
              >
                <span>#{i + 1} {entry.displayName}</span>
                <span>Week {Math.floor(entry.weeksSurvived)}</span>
              </div>
            ))}
            {ownEntry && !ownInTopN && ownRank !== null && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 4px', marginTop: 8,
                borderTop: `1px solid ${CONFIG.UI_INK_COLOR}33`,
              }}>
                <span>#{ownRank} — You</span>
                <span>Week {Math.floor(ownEntry.weeksSurvived)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              background: CONFIG.UI_PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 28px', fontSize: 15, cursor: 'pointer', fontFamily: 'monospace',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
