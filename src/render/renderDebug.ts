import type { GameState, StationShape } from '../types/game';
import { CONFIG } from '../config/gameConfig';
import { ALL_SHAPES } from '../logic/shapes';

const SYM: Record<string, string> = {
  circle: '●', triangle: '▲', square: '■', star: '★', hexagon: 'H', plus: '+',
};
const DIR: Record<number, string> = { 1: '→', [-1]: '←' };

const BUTTON_W = 30;
const BUTTON_H = 24;
const BUTTON_GAP = 4;

function getMenuShapes(state: GameState, stationId?: string): StationShape[] {
  if (!stationId) return ALL_SHAPES;
  const station = state.stations[stationId];
  return ALL_SHAPES.filter(s => s !== station?.shape);
}

function drawPopup(
  ctx: CanvasRenderingContext2D,
  menuPos: { x: number; y: number },
  shapes: ShapeShape[],
  title: string,
) {
  const totalW = shapes.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;

  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.roundRect(menuPos.x - 4, menuPos.y - 18, totalW + 8, BUTTON_H + 24, 5);
  ctx.fill();

  // Title
  ctx.fillStyle = '#ccc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(title, menuPos.x, menuPos.y - 6);

  // Buttons
  for (let i = 0; i < shapes.length; i++) {
    const bx = menuPos.x + i * (BUTTON_W + BUTTON_GAP);
    const by = menuPos.y;

    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, BUTTON_W, BUTTON_H, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SYM[shapes[i]], bx + BUTTON_W / 2, by + BUTTON_H / 2);
  }

  ctx.restore();
}

// TypeScript: fix the `ShapeShape` typo used in drawPopup signature
type ShapeShape = StationShape;

export function renderDebug(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.debugMode) return;

  const panelX = CONFIG.CANVAS_WIDTH - 210;
  const panelW = 205;
  const padding = 8;
  const lineH = 14;

  // --- Build train status lines ---
  const trainLines: Array<{ text: string; color: string }> = [];
  for (const train of Object.values(state.trains)) {
    const metroLine = state.lines[train.lineId];
    if (!metroLine) continue;
    const currentStation = state.stations[metroLine.stationIds[train.targetStationIndex]];
    const atLabel = currentStation?.label ?? '?';
    const passengers = train.passengers.map(p => SYM[p.destinationShape] ?? '?').join('');
    const dirSym = DIR[train.direction] ?? '?';
    const stateSym = train.state === 'stopped' ? '◼' : '▶';
    trainLines.push({
      text: `${stateSym}${dirSym} @${atLabel} [${passengers || '·'}] (${train.passengers.length}/${train.maxCapacity})`,
      color: metroLine.color,
    });
  }

  // Speed indicator
  const speedLabel = state.debugSpeed === 0 ? 'PAUSED' : `${state.debugSpeed}×`;
  const totalRows = trainLines.length + 3 + Math.min(state.debugLog.length, 15) + 2;
  const panelH = totalRows * lineH + padding * 2;

  ctx.save();

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.roundRect(panelX, 4, panelW, panelH, 6);
  ctx.fill();

  let y = 4 + padding + lineH - 2;

  // Header
  ctx.fillStyle = '#aaa';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const stationsFlag = state.debugPauseStations ? 'S:OFF' : 'S:on';
  const passengersFlag = state.debugPausePassengers ? 'P:OFF' : 'P:on';
  ctx.fillText(`DEBUG [D]  spd:${speedLabel}[0-3] A=+stn`, panelX + padding, y);
  y += lineH;
  ctx.fillStyle = state.debugPauseStations ? '#e74c3c' : '#2ecc71';
  ctx.fillText(`${stationsFlag}[S]  ${passengersFlag}[P]`, panelX + padding, y);
  y += lineH + 2;

  // Train statuses
  for (const { text, color } of trainLines) {
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.fillText(text, panelX + padding, y);
    y += lineH;
  }

  // Separator
  y += 4;
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(panelX + padding, y - 2);
  ctx.lineTo(panelX + panelW - padding, y - 2);
  ctx.stroke();

  // Log entries
  const logSlice = state.debugLog.slice(-15);
  for (const entry of logSlice) {
    ctx.fillStyle = entry.includes('✓') ? '#2ecc71'
      : entry.includes('transfer') ? '#f39c12'
      : entry.includes('skipped') ? '#e74c3c'
      : '#ddd';
    ctx.font = '10px monospace';
    ctx.fillText(entry.slice(0, 28), panelX + padding, y);
    y += lineH;
  }

  ctx.restore();

  // Placing-station hint
  if (state.debugPlacingStation) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 28, CONFIG.CANVAS_WIDTH, 28);
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click anywhere to place station  [A or Esc to cancel]', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 14);
    ctx.restore();
  }

  // Action popup (passenger picker or station shape picker)
  const action = state.debugAction;
  if (action) {
    if (action.type === 'pick_passenger') {
      const shapes = getMenuShapes(state, action.stationId);
      const stationLabel = state.stations[action.stationId]?.label ?? '';
      drawPopup(ctx, action.menuPos, shapes, `Add passenger to ${stationLabel}:`);
    } else {
      drawPopup(ctx, action.menuPos, ALL_SHAPES, 'New station shape:');
    }
  }
}
