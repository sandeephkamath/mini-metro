import { CONFIG } from '../config/gameConfig';

interface SettingsScreenProps {
  musicEnabled: boolean;
  soundEnabled: boolean;
  onToggleMusic: () => void;
  onToggleSound: () => void;
  onClose: () => void;
}

// A pill-shaped on/off switch, matching the app's own chrome rather than a native
// checkbox — same visual language as the rest of the dialog shells.
function ToggleSwitch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: on ? CONFIG.UI_PRIMARY_COLOR : '#d8d0c0',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: on ? 23 : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.15s ease',
      }} />
    </button>
  );
}

function SettingsRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      padding: '10px 0',
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 15, color: CONFIG.UI_INK_COLOR }}>{label}</span>
      <ToggleSwitch on={on} onClick={onClick} label={label} />
    </div>
  );
}

// Modal overlay on top of the home screen (home_screen.md § Settings) — rendered
// upright as a sibling of the rotated stage, same treatment as the Collectibles
// Screen (themes/metro.md §11 B19: rotated text loses legibility).
export function SettingsScreen({ musicEnabled, soundEnabled, onToggleMusic, onToggleSound, onClose }: SettingsScreenProps) {
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
      <div style={{ position: 'relative', width: 'min(320px, 90vw)' }}>
        <button
          onClick={onClose}
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
            border: `1px solid ${CONFIG.UI_INK_COLOR}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            color: CONFIG.UI_INK_COLOR,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            zIndex: 1,
          }}
        >
          ×
        </button>
        <div style={{
          background: CONFIG.UI_BG_COLOR,
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontFamily: 'monospace', textAlign: 'center', color: CONFIG.UI_INK_COLOR }}>Settings</h2>

          <div style={{ borderTop: `1px solid ${CONFIG.UI_MUTED_TEXT_COLOR}33` }}>
            <SettingsRow label="Music" on={musicEnabled} onClick={onToggleMusic} />
            <div style={{ borderTop: `1px solid ${CONFIG.UI_MUTED_TEXT_COLOR}33` }} />
            <SettingsRow label="Sound" on={soundEnabled} onClick={onToggleSound} />
          </div>

          {CONFIG.PRIVACY_POLICY_URL && (
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <a
                href={CONFIG.PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'monospace', fontSize: 13, color: CONFIG.UI_MUTED_TEXT_COLOR }}
              >
                Privacy Policy
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
