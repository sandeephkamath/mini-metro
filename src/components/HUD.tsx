import { useRef, useState } from 'react';
import type { ReserveItemKind } from '../types/game';
import { CONFIG } from '../config/gameConfig';

interface LineSlot {
  id: string;
  color: string;
  isUnlocked: boolean;
  hasStations: boolean;
}

const DELETE_HOLD_MS = 600;

interface HUDProps {
  score: number;
  weekNumber: number;
  level: number;
  weekProgress: number; // 0..1 fraction of the current week elapsed
  lineSlots: LineSlot[];
  milestoneMessage: string;
  milestoneAge: number; // ms since last milestone bonus was granted
  reserveCarriers: number;
  reserveCarriages: number;
  selectedReserveItem: ReserveItemKind | null;
  onSelectReserveCarrier: () => void;
  onSelectReserveCarriage: () => void;
  overflowRiskActive: boolean; // true while any Station is in Overflow Risk — recolors the clock badge
  playerPaused: boolean;
  playerSpeedMultiplier: 1 | 2;
  onPause: () => void;
  onPlayNormal: () => void;
  onFastForward: () => void;
  onDeleteLine: (lineId: string) => void;
}

// The clock badge doubles as the original's global danger cue: it recolors solid
// red while any Station is in Overflow Risk, reverting once every station recovers
// (see specs/mini_metro_original_analysis_2_ui_timing.md §1).
function ClockBadge({ weekProgress, overflowRiskActive }: { weekProgress: number; overflowRiskActive: boolean }) {
  const dayCount = CONFIG.DAY_NAMES.length;
  const dayIndex = Math.floor(weekProgress * dayCount) % dayCount;
  const hourAngle = weekProgress * 360; // one slow sweep per week
  const minuteAngle = ((weekProgress * dayCount) % 1) * 360; // one fast sweep per day

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '12px', letterSpacing: '1px', opacity: 0.85 }}>
        {CONFIG.DAY_NAMES[dayIndex]}
      </span>
      <div
        data-testid="hud-overflow-clock"
        style={{
          position: 'relative',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: overflowRiskActive ? '#c0392b' : '#b5675c',
          border: overflowRiskActive ? '2px solid #7a221a' : '2px solid #8b4a42',
          flexShrink: 0,
          transition: 'background 0.2s, border-color 0.2s',
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

// Player-facing Pause / Play / Fast-Forward — promoted from debug-only speed
// controls to a normal in-game feature (see mini_metro_original_analysis_2_ui_timing.md §3).
function SpeedControls({ playerPaused, playerSpeedMultiplier, onPause, onPlayNormal, onFastForward }: {
  playerPaused: boolean;
  playerSpeedMultiplier: 1 | 2;
  onPause: () => void;
  onPlayNormal: () => void;
  onFastForward: () => void;
}) {
  function btnStyle(active: boolean) {
    return {
      background: active ? '#444' : 'transparent',
      color: active ? '#fff' : '#999',
      border: 'none',
      borderRadius: '4px',
      width: 22,
      height: 22,
      fontSize: '11px',
      lineHeight: '22px',
      padding: 0,
      cursor: 'pointer',
      pointerEvents: 'auto' as const,
    };
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <button style={btnStyle(playerPaused)} onClick={onPause} title="Pause">II</button>
      <button style={btnStyle(!playerPaused && playerSpeedMultiplier === 1)} onClick={onPlayNormal} title="Play">▶</button>
      <button style={btnStyle(!playerPaused && playerSpeedMultiplier === 2)} onClick={onFastForward} title="Fast-forward">▶▶</button>
    </div>
  );
}

export function HUD({
  score, weekNumber, level, weekProgress, lineSlots, milestoneMessage, milestoneAge,
  reserveCarriers, reserveCarriages, selectedReserveItem,
  onSelectReserveCarrier, onSelectReserveCarriage,
  overflowRiskActive, playerPaused, playerSpeedMultiplier, onPause, onPlayNormal, onFastForward,
  onDeleteLine,
}: HUDProps) {
  const toastVisible = milestoneAge < 3000 && milestoneMessage;
  const toastOpacity = toastVisible ? Math.min(1, Math.max(0, 1 - (milestoneAge - 2000) / 1000)) : 0;

  // Hold-to-delete on a Line's own legend swatch — grows into a red circle with an
  // X over DELETE_HOLD_MS; releasing early cancels. Matches the original's gesture
  // (specs/mini_metro_original_analysis_2_ui_timing.md §5). Pure UI feedback state —
  // the actual deletion is a single onDeleteLine call once the hold completes.
  const [holdingLineId, setHoldingLineId] = useState<string | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  function startHold(lineId: string, hasStations: boolean) {
    if (!hasStations) return;
    setHoldingLineId(lineId);
    holdTimerRef.current = window.setTimeout(() => {
      onDeleteLine(lineId);
      holdTimerRef.current = null;
      setHoldingLineId(null);
    }, DELETE_HOLD_MS);
  }

  function cancelHold() {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingLineId(null);
  }

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
        <span>
          <span data-testid="hud-week">Week {weekNumber}</span>
          <span style={{ opacity: 0.6 }}> · Level {level}</span>
        </span>
        <span style={{ opacity: 0.6, fontSize: '12px' }}>drag between stations to draw lines</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SpeedControls
            playerPaused={playerPaused}
            playerSpeedMultiplier={playerSpeedMultiplier}
            onPause={onPause}
            onPlayNormal={onPlayNormal}
            onFastForward={onFastForward}
          />
          <ClockBadge weekProgress={weekProgress} overflowRiskActive={overflowRiskActive} />
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
          {lineSlots.map((slot, i) => {
            if (!slot.isUnlocked) {
              return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#666' }} />;
            }
            const holding = holdingLineId === slot.id;
            return (
              <div
                key={i}
                data-testid={`hud-line-swatch-${slot.id}`}
                onMouseDown={() => startHold(slot.id, slot.hasStations)}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={() => startHold(slot.id, slot.hasStations)}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                title={slot.hasStations ? 'Hold to delete this line' : undefined}
                style={{
                  width: holding ? 34 : 20,
                  height: holding ? 34 : 20,
                  borderRadius: '50%',
                  background: holding ? '#e74c3c' : slot.color,
                  border: '1px solid rgba(255,255,255,0.3)',
                  transition: `width ${DELETE_HOLD_MS}ms linear, height ${DELETE_HOLD_MS}ms linear, background ${DELETE_HOLD_MS}ms linear`,
                  cursor: slot.hasStations ? 'pointer' : 'default',
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  touchAction: 'none',
                }}
              >
                {holding && <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1 }}>×</span>}
              </div>
            );
          })}
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
