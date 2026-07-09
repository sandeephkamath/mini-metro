interface AdConfirmModalProps {
  message: string;
  onAccept: () => void;
  onDecline: () => void;
  // Game-Over Continue prompt (metro.md §4.2) uses a corner close icon instead of a
  // "No Thanks" button, matching the Game Over / Collectibles dialogs' close pattern.
  // The On-Demand Bonus prompt keeps the two-button layout.
  closeIconOnly?: boolean;
}

// The yes/no Rewarded Ad offer (core/monetization.md §1) — shared presentation for
// both the On-Demand Bonus Request and the Game-Over Continue prompt.
export function AdConfirmModal({ message, onAccept, onDecline, closeIconOnly }: AdConfirmModalProps) {
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
        position: 'relative',
        background: '#fff',
        borderRadius: '10px',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        textAlign: 'center',
        minWidth: 300,
      }}>
        {closeIconOnly && (
          <button
            onClick={onDecline}
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
        )}
        <p style={{ margin: '0 0 20px', fontFamily: 'monospace', fontSize: 15 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {!closeIconOnly && (
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
          )}
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
