import type { ReserveItemKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';

interface LineSlot {
  color: string;
  isUnlocked: boolean;
}

interface HUDProps {
  score: number;
  weekNumber: number;
  weekProgress: number; // 0..1 fraction of the current week elapsed
  lineSlots: LineSlot[];
  milestoneMessage: string;
  milestoneAge: number; // ms since last milestone bonus was granted
  reserveCarriers: number;
  reserveCarriages: number;
  selectedReserveItem: ReserveItemKind | null;
  onSelectReserveCarrier: () => void;
  onSelectReserveCarriage: () => void;
}

function ClockBadge({ weekProgress }: { weekProgress: number }) {
  const dayCount = CONFIG.DAY_NAMES.length;
  const dayIndex = Math.floor(weekProgress * dayCount) % dayCount;
  const hourAngle = weekProgress * 360; // one slow sweep per week
  const minuteAngle = ((weekProgress * dayCount) % 1) * 360; // one fast sweep per day

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '12px', letterSpacing: '1px', opacity: 0.85 }}>
        {CONFIG.DAY_NAMES[dayIndex]}
      </span>
      <div style={{
        position: 'relative',
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#b5675c',
        border: '2px solid #8b4a42',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 2, height: 8,
          background: '#fdf6ec', borderRadius: 1, transformOrigin: '50% 100%',
          transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 1.5, height: 6,
          background: '#fdf6ec', borderRadius: 1, transformOrigin: '50% 100%',
          transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
        }} />
      </div>
    </div>
  );
}

export function HUD({
  score, weekNumber, weekProgress, lineSlots, milestoneMessage, milestoneAge,
  reserveCarriers, reserveCarriages, selectedReserveItem,
  onSelectReserveCarrier, onSelectReserveCarriage,
}: HUDProps) {
  const toastVisible = milestoneAge < 3000 && milestoneMessage;
  const toastOpacity = toastVisible ? Math.min(1, Math.max(0, 1 - (milestoneAge - 2000) / 1000)) : 0;

  function depotButtonStyle(count: number, selected: boolean) {
    return {
      background: selected ? '#e74c3c' : count > 0 ? '#333' : '#222',
      color: count > 0 ? '#fff' : '#666',
      border: selected ? '2px solid #fff' : '2px solid transparent',
      borderRadius: '6px',
      padding: '4px 10px',
      fontFamily: 'monospace',
      fontSize: '12px',
      cursor: count > 0 ? 'pointer' : 'default',
      pointerEvents: 'auto' as const,
    };
  }

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
        <span data-testid="hud-week">Week {weekNumber}</span>
        <span style={{ opacity: 0.6, fontSize: '12px' }}>drag between stations to draw lines</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ClockBadge weekProgress={weekProgress} />
          <span data-testid="hud-score" style={{ fontSize: '22px', fontWeight: 'bold' }}>{score}</span>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.65)',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <button
          onClick={onSelectReserveCarrier}
          disabled={reserveCarriers === 0}
          style={depotButtonStyle(reserveCarriers, selectedReserveItem === 'carrier')}
          title="Depot Train — click, then click a line to place it"
        >
          🚆 ×{reserveCarriers}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lineSlots.map((slot, i) => (
            slot.isUnlocked ? (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: slot.color, border: '1px solid rgba(255,255,255,0.3)',
              }} />
            ) : (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#666',
              }} />
            )
          ))}
        </div>

        <button
          onClick={onSelectReserveCarriage}
          disabled={reserveCarriages === 0}
          style={depotButtonStyle(reserveCarriages, selectedReserveItem === 'carriage')}
          title="Depot Carriage — click, then click a train to attach it"
        >
          🚃 ×{reserveCarriages}
        </button>
      </div>

      {selectedReserveItem && (
        <div style={{
          position: 'absolute',
          top: 44,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '6px 14px',
          borderRadius: '16px',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {selectedReserveItem === 'carrier'
            ? 'Click a line to place the train [Esc to cancel]'
            : 'Click a train to attach the carriage [Esc to cancel]'}
        </div>
      )}

      {toastVisible && (
        <div style={{
          position: 'absolute',
          bottom: 52,
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
          {milestoneMessage}
        </div>
      )}
    </>
  );
}
