import type { ReserveItemKind } from '../types/game';

interface HUDProps {
  score: number;
  weekNumber: number;
  milestoneMessage: string;
  milestoneAge: number; // ms since last milestone bonus was granted
  reserveCarriers: number;
  reserveCarriages: number;
  selectedReserveItem: ReserveItemKind | null;
  onSelectReserveCarrier: () => void;
  onSelectReserveCarriage: () => void;
}

export function HUD({
  score, weekNumber, milestoneMessage, milestoneAge,
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
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'none' }}>
          <button
            onClick={onSelectReserveCarrier}
            disabled={reserveCarriers === 0}
            style={depotButtonStyle(reserveCarriers, selectedReserveItem === 'carrier')}
            title="Depot Train — click, then click a line to place it"
          >
            🚆 Train ×{reserveCarriers}
          </button>
          <button
            onClick={onSelectReserveCarriage}
            disabled={reserveCarriages === 0}
            style={depotButtonStyle(reserveCarriages, selectedReserveItem === 'carriage')}
            title="Depot Carriage — click, then click a train to attach it"
          >
            🚃 Carriage ×{reserveCarriages}
          </button>
        </div>
        <span data-testid="hud-score" style={{ fontSize: '22px', fontWeight: 'bold' }}>{score}</span>
        <span style={{ opacity: 0.6, fontSize: '12px' }}>drag between stations to draw lines</span>
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
          {milestoneMessage}
        </div>
      )}
    </>
  );
}
