interface AdConfirmModalProps {
  message: string;
  onAccept: () => void;
  onDecline: () => void;
}

// The yes/no Rewarded Ad offer (core/monetization.md §1) — shared presentation for
// both the On-Demand Bonus Request and the Game-Over Continue prompt.
export function AdConfirmModal({ message, onAccept, onDecline }: AdConfirmModalProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 30,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        textAlign: 'center',
        minWidth: 300,
      }}>
        <p style={{ margin: '0 0 20px', fontFamily: 'monospace', fontSize: 15 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onDecline}
            style={{
              background: '#eee',
              color: '#333',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            No Thanks
          </button>
          <button
            onClick={onAccept}
            style={{
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Watch Ad
          </button>
        </div>
      </div>
    </div>
  );
}
