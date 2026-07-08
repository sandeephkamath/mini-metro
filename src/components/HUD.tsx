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
const INK = '#2d2d2d'; // dark text/icon color for the transparent HUD, matching the home screen's ink

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
  overflowRiskActive: boolean; // true while any Station is in Overflow Risk — recolors the clock badge
  playerPaused: boolean;
  playerSpeedMultiplier: 1 | 2;
  onPause: () => void;
  onPlayNormal: () => void;
  onFastForward: () => void;
  onDeleteLine: (lineId: string) => void;
  adAvailable: boolean; // core/monetization.md §4 — Ad Provider availability
  onRequestBonus: () => void;
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
      color: active ? '#fff' : INK,
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
  score, weekNumber, weekProgress, lineSlots, milestoneMessage, milestoneAge,
  reserveCarriers, reserveCarriages, selectedReserveItem,
  onSelectReserveCarrier, onSelectReserveCarriage,
  overflowRiskActive, playerPaused, playerSpeedMultiplier, onPause, onPlayNormal, onFastForward,
  onDeleteLine, adAvailable, onRequestBonus,
}: HUDProps) {
  const toastVisible = milestoneAge < 3000 && milestoneMessage;
  const toastOpacity = toastVisible ? Math.min(1, Math.max(0, 1 - (milestoneAge - 2000) / 1000)) : 0;

  // Hold-to-delete on a Line's own legend swatch — grows into a red circle with an
  // X over DELETE_HOLD_MS; releasing early cancels. Matches the original's gesture
  // (specs/mini_metro_original_analysis_2_ui_timing.md §5). Pure UI feedback state —
  // the actual deletion is a single onDeleteLine call once the hold completes.
  //
  // Keyed per-Line (Set + Map), not a single shared value — two fingers can hold two
  // different Lines' swatches at once on touch (impossible with a single mouse, so this
  // was missed until a real multi-touch pass caught it): a single shared value meant a
  // second touchstart overwrote the first hold's tracking, silently orphaning its timer.
  const [holdingLineIds, setHoldingLineIds] = useState<Set<string>>(new Set());
  const holdTimersRef = useRef<Map<string, number>>(new Map());

  function startHold(lineId: string, hasStations: boolean) {
    if (!hasStations || holdTimersRef.current.has(lineId)) return;
    setHoldingLineIds(prev => new Set(prev).add(lineId));
    const timer = window.setTimeout(() => {
      onDeleteLine(lineId);
      holdTimersRef.current.delete(lineId);
      setHoldingLineIds(prev => {
        const next = new Set(prev);
        next.delete(lineId);
        return next;
      });
    }, DELETE_HOLD_MS);
    holdTimersRef.current.set(lineId, timer);
  }

  function cancelHold(lineId: string) {
    const timer = holdTimersRef.current.get(lineId);
    if (timer !== undefined) {
      clearTimeout(timer);
      holdTimersRef.current.delete(lineId);
    }
    setHoldingLineIds(prev => {
      if (!prev.has(lineId)) return prev;
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });
  }

  // A Depot button reads ×0 in one of two states (metro.md §4.2): genuinely
  // inert (no ad available, nothing to do) or an On-Demand Bonus Request
  // trigger in disguise (ad available) — the latter gets a distinct tinted
  // look so it doesn't read as simply broken.
  function depotButtonStyle(count: number, selected: boolean, requestable: boolean) {
    return {
      background: selected ? '#e74c3c' : count > 0 ? '#333' : requestable ? '#28414d' : '#222',
      color: count > 0 ? '#fff' : requestable ? '#bfe4f5' : '#666',
      border: selected
        ? '2px solid #fff'
        : requestable
          ? '2px solid #4fa3c4'
          : '2px solid transparent',
      borderRadius: '6px',
      padding: '4px 10px',
      fontFamily: 'monospace',
      fontSize: '12px',
      cursor: count > 0 || requestable ? 'pointer' : 'default',
      pointerEvents: 'auto' as const,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    };
  }

  // Depot icons drawn in the game's own visual language (metro.md §4.1, §7 item
  // 10 — rounded-carriage shapes) rather than generic pictographs: a Train is
  // two coupled carriages, a Carriage is one, so the two read as distinct at a
  // glance regardless of button state.
  function TrainIcon({ color }: { color: string }) {
    return (
      <svg width="20" height="12" viewBox="0 0 20 12" style={{ display: 'block', flexShrink: 0 }}>
        <line x1="9" y1="6" x2="11" y2="6" stroke={color} strokeWidth="1.5" />
        <rect x="1" y="1" width="8" height="10" rx="3" fill={color} />
        <rect x="11" y="1" width="8" height="10" rx="3" fill={color} />
      </svg>
    );
  }
  function CarriageIcon({ color }: { color: string }) {
    return (
      <svg width="11" height="12" viewBox="0 0 11 12" style={{ display: 'block', flexShrink: 0 }}>
        <rect x="1" y="1" width="9" height="10" rx="3" fill={color} />
      </svg>
    );
  }

  function handleCarrierClick() {
    if (reserveCarriers > 0) onSelectReserveCarrier();
    else if (adAvailable) onRequestBonus();
  }
  function handleCarriageClick() {
    if (reserveCarriages > 0) onSelectReserveCarriage();
    else if (adAvailable) onRequestBonus();
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
        color: INK,
        fontFamily: 'monospace',
        fontSize: '14px',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <span data-testid="hud-week">Week {weekNumber}</span>
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
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <button
          data-testid="hud-depot-carrier"
          onClick={handleCarrierClick}
          disabled={reserveCarriers === 0 && !adAvailable}
          style={depotButtonStyle(reserveCarriers, selectedReserveItem === 'carrier', reserveCarriers === 0 && adAvailable)}
          title={reserveCarriers > 0
            ? 'Depot Train — click, then click a line to place it'
            : adAvailable
              ? 'Watch an ad to get a free Train or Carriage'
              : undefined}
        >
          <TrainIcon color={reserveCarriers > 0 ? '#fff' : reserveCarriers === 0 && adAvailable ? '#bfe4f5' : '#666'} />
          ×{reserveCarriers}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lineSlots.map((slot, i) => {
            if (!slot.isUnlocked) {
              return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#666' }} />;
            }
            const holding = holdingLineIds.has(slot.id);
            return (
              <div
                key={i}
                data-testid={`hud-line-swatch-${slot.id}`}
                onMouseDown={() => startHold(slot.id, slot.hasStations)}
                onMouseUp={() => cancelHold(slot.id)}
                onMouseLeave={() => cancelHold(slot.id)}
                onTouchStart={() => startHold(slot.id, slot.hasStations)}
                onTouchEnd={() => cancelHold(slot.id)}
                onTouchCancel={() => cancelHold(slot.id)}
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
          data-testid="hud-depot-carriage"
          onClick={handleCarriageClick}
          disabled={reserveCarriages === 0 && !adAvailable}
          style={depotButtonStyle(reserveCarriages, selectedReserveItem === 'carriage', reserveCarriages === 0 && adAvailable)}
          title={reserveCarriages > 0
            ? 'Depot Carriage — click, then click a train to attach it'
            : adAvailable
              ? 'Watch an ad to get a free Train or Carriage'
              : undefined}
        >
          <CarriageIcon color={reserveCarriages > 0 ? '#fff' : reserveCarriages === 0 && adAvailable ? '#bfe4f5' : '#666'} />
          ×{reserveCarriages}
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
