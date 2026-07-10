interface ExitConfirmModalProps {
  onExit: () => void;
  onCancel: () => void;
}

// Android back-button confirmation (themes/metro.md §8.1) — always renders upright,
// as a sibling of the rotated inner stage in GameCanvas.tsx, same as GameOverScreen.
export function ExitConfirmModal({ onExit, onCancel }: ExitConfirmModalProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 40,
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
        <p style={{ margin: '0 0 20px', fontFamily: 'monospace', fontSize: 15 }}>Exit game?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
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
            Cancel
          </button>
          <button
            onClick={onExit}
            style={{
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
