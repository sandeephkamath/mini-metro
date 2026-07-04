interface DeliveryModalProps {
  weekNumber: number;
  message: string;
}

export function DeliveryModal({ weekNumber, message }: DeliveryModalProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
      zIndex: 15,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        padding: '24px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <h3 style={{ margin: '0 0 8px', fontFamily: 'monospace' }}>Week {weekNumber} Complete!</h3>
        <p style={{ color: '#555', margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
