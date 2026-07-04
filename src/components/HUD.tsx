interface HUDProps {
  score: number;
  weekNumber: number;
  deliveryMessage: string;
  deliveryAge: number; // ms since last delivery
}

export function HUD({ score, weekNumber, deliveryMessage, deliveryAge }: HUDProps) {
  const toastVisible = deliveryAge < 3000 && deliveryMessage;
  const toastOpacity = toastVisible ? Math.max(0, 1 - (deliveryAge - 2000) / 1000) : 0;

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.65)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <span>Week {weekNumber}</span>
        <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{score}</span>
        <span style={{ opacity: 0.6, fontSize: '12px' }}>drag between stations to draw lines</span>
      </div>

      {toastVisible && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: '8px 18px',
          borderRadius: '20px',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: toastOpacity,
          whiteSpace: 'nowrap',
        }}>
          {deliveryMessage}
        </div>
      )}
    </>
  );
}
