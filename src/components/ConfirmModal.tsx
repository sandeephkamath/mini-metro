import { CONFIG } from '../config/gameConfig';

interface ConfirmModalProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generic Confirm/Cancel dialog shell, always upright regardless of device rotation
// (themes/metro.md §6.1) — shared by the Android Exit confirmation (§8.1) and the
// Game Over restart confirmation (§8).
export function ConfirmModal({ message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
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
        background: CONFIG.UI_BG_COLOR,
        borderRadius: '10px',
        padding: '28px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        textAlign: 'center',
        minWidth: 300,
      }}>
        <p style={{ margin: '0 0 20px', fontFamily: 'monospace', fontSize: 15, color: CONFIG.UI_INK_COLOR }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#fff',
              color: CONFIG.UI_INK_COLOR,
              border: `1px solid ${CONFIG.UI_INK_COLOR}`,
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
            onClick={onConfirm}
            style={{
              background: CONFIG.UI_PRIMARY_COLOR,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
