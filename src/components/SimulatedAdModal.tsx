import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config/gameConfig';

interface SimulatedAdModalProps {
  onComplete: () => void;
}

// The development stand-in Ad Provider (core/monetization.md §4, metro.md §4.2): a
// fixed-duration placeholder that always completes successfully, so the rest of the
// monetization flow can be built/tested before a real ad SDK is integrated. Runs on
// wall-clock time — the Game Clock is already frozen for the whole ad flow.
export function SimulatedAdModal({ onComplete }: SimulatedAdModalProps) {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / CONFIG.SIMULATED_AD_DURATION_MS);
      setProgress(t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      zIndex: 30,
    }}>
      <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 16, marginBottom: 16 }}>Ad playing…</div>
        <div style={{ width: 220, height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: '#3498db' }} />
        </div>
      </div>
    </div>
  );
}
