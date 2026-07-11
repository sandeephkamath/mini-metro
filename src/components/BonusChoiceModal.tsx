import type { MilestoneBonusKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';

interface BonusChoiceModalProps {
  title: string;
  subtitle: string;
  hint?: string; // first-occurrence explanatory line (TUTORIAL.md §9) — free Milestone Choice only
  onChoose: (kind: MilestoneBonusKind) => void;
}

const OPTIONS: Array<{ kind: MilestoneBonusKind; label: string; desc: string }> = [
  { kind: 'carrier', label: 'New Train', desc: 'Adds a train to the Depot — place it on any line' },
  { kind: 'carriage', label: 'New Carriage', desc: 'Adds a carriage to the Depot — attach it to any train' },
];

// The Weekly Upgrade's Choice-mode popup (core/logic.md §3 Milestone Events) — also
// reused, same presentation, for the ad-gated bonus-kind pick after a completed
// Rewarded Ad (core/monetization.md §2, §3 — "using the same choice presentation").
export function BonusChoiceModal({ title, subtitle, hint, onChoose }: BonusChoiceModalProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 15,
    }}>
      <div style={{
        background: CONFIG.UI_BG_COLOR,
        borderRadius: '10px',
        padding: '24px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        textAlign: 'center',
        minWidth: 320,
      }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'monospace', color: CONFIG.UI_INK_COLOR }}>{title}</h3>
        <p style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, margin: hint ? '0 0 8px' : '0 0 20px', fontSize: '13px' }}>{subtitle}</p>
        {hint && (
          <p style={{ color: CONFIG.UI_MUTED_TEXT_COLOR, margin: '0 0 20px', fontSize: '11px', fontStyle: 'italic' }}>{hint}</p>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.kind}
              onClick={() => onChoose(opt.kind)}
              style={{
                flex: 1,
                background: '#fff',
                border: `2px solid ${CONFIG.UI_INK_COLOR}`,
                borderRadius: '8px',
                padding: '14px 10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 6, color: CONFIG.UI_INK_COLOR }}>{opt.label}</div>
              <div style={{ fontSize: '11px', color: CONFIG.UI_MUTED_TEXT_COLOR }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
