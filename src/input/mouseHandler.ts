import type { GameState, StationShape, Vec2 } from '../types/game';
import { getStationAt, trySpawnStationAt } from '../logic/stations';
import { getAvailableLine, getLineEndpointAt, addStationToLine, getSegmentAt, insertStationIntoLine } from '../logic/lines';
import { CONFIG } from '../config/gameConfig';

// Debug popup: 3 shape buttons in a row, each BUTTON_W × BUTTON_H
const BUTTON_W = 30;
const BUTTON_H = 24;
const BUTTON_GAP = 4;
const ALL_SHAPES: StationShape[] = ['circle', 'triangle', 'square'];

function getMenuShapes(state: GameState, stationId?: string): StationShape[] {
  if (!stationId) return ALL_SHAPES;
  const station = state.stations[stationId];
  return ALL_SHAPES.filter(s => s !== station?.shape);
}

function hitButton(
  x: number, y: number,
  menuPos: Vec2,
  shapes: StationShape[],
): StationShape | null {
  for (let i = 0; i < shapes.length; i++) {
    const bx = menuPos.x + i * (BUTTON_W + BUTTON_GAP);
    const by = menuPos.y;
    if (x >= bx && x <= bx + BUTTON_W && y >= by && y <= by + BUTTON_H) {
      return shapes[i];
    }
  }
  return null;
}

// ── Debug mouse handler ────────────────────────────────────────────────────
function onDebugMouseDown(state: GameState, x: number, y: number): void {
  const action = state.debugAction;

  // If a popup is open, check for button hit first
  if (action) {
    const shapes = action.type === 'pick_passenger'
      ? getMenuShapes(state, action.stationId)
      : ALL_SHAPES;
    const hit = hitButton(x, y, action.menuPos, shapes);

    if (hit) {
      if (action.type === 'pick_passenger') {
        const station = state.stations[action.stationId];
        if (station && station.passengerQueue.length < station.maxCapacity) {
          station.passengerQueue.push({
            id: `p${++state.nextIds.passenger}`,
            destinationShape: hit,
            originStationId: station.id,
          });
        }
      } else {
        // place_station_shape
        trySpawnStationAt(state, action.menuPos, hit);
      }
    }
    // Any click (hit or miss) closes the popup
    state.debugAction = null;
    return;
  }

  // Placing station mode: record click position and open shape picker
  if (state.debugPlacingStation) {
    state.debugPlacingStation = false;
    state.debugAction = { type: 'pick_station_shape', menuPos: clampMenu(x, y) };
    return;
  }

  // Click on a station → open passenger type picker
  const station = getStationAt(state, { x, y });
  if (station) {
    state.debugAction = { type: 'pick_passenger', stationId: station.id, menuPos: clampMenu(x, y - 40) };
  }
}

function clampMenu(x: number, y: number): Vec2 {
  const totalW = ALL_SHAPES.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
  return {
    x: Math.min(x, CONFIG.CANVAS_WIDTH - totalW - 4),
    y: Math.max(4, Math.min(y, CONFIG.CANVAS_HEIGHT - BUTTON_H - 4)),
  };
}

// ── Regular mouse handlers ─────────────────────────────────────────────────
export function onMouseDown(state: GameState, canvasX: number, canvasY: number): void {
  if (state.phase !== 'playing') return;

  if (state.debugMode) {
    onDebugMouseDown(state, canvasX, canvasY);
    return;
  }

  // Grabbing a line's end tab extends that specific line, even if other lines
  // also terminate at the same station (e.g. a station with several route ends).
  const endpoint = getLineEndpointAt(state, { x: canvasX, y: canvasY });
  if (endpoint) {
    state.drawing.isDrawing = true;
    state.drawing.startStationId = endpoint.stationId;
    state.drawing.insertAfterIndex = null;
    state.drawing.grabPos = null;
    state.drawing.mousePos = { x: canvasX, y: canvasY };
    state.drawing.lineId = endpoint.lineId;
    return;
  }

  // Clicking a station's body (not a specific line's end tab) always starts a
  // fresh route — a station is never "owned" by a color.
  const station = getStationAt(state, { x: canvasX, y: canvasY });
  if (station) {
    state.drawing.isDrawing = true;
    state.drawing.startStationId = station.id;
    state.drawing.insertAfterIndex = null;
    state.drawing.grabPos = null;
    state.drawing.mousePos = { x: canvasX, y: canvasY };
    state.drawing.lineId = null;
    return;
  }

  const segment = getSegmentAt(state, { x: canvasX, y: canvasY });
  if (segment) {
    state.drawing.isDrawing = true;
    state.drawing.startStationId = null;
    state.drawing.insertAfterIndex = segment.afterIndex;
    state.drawing.grabPos = { x: canvasX, y: canvasY };
    state.drawing.mousePos = { x: canvasX, y: canvasY };
    state.drawing.lineId = segment.lineId;
  }
}

export function onMouseMove(state: GameState, canvasX: number, canvasY: number): void {
  if (!state.drawing.isDrawing) return;
  state.drawing.mousePos = { x: canvasX, y: canvasY };
}

export function onMouseUp(state: GameState, canvasX: number, canvasY: number): void {
  if (!state.drawing.isDrawing) return;

  const endStation = getStationAt(state, { x: canvasX, y: canvasY });
  const startId = state.drawing.startStationId;
  const insertAfterIndex = state.drawing.insertAfterIndex;

  if (endStation && insertAfterIndex !== null && state.drawing.lineId) {
    const line = state.lines[state.drawing.lineId];
    if (line && !line.stationIds.includes(endStation.id)) {
      insertStationIntoLine(state, state.drawing.lineId, insertAfterIndex, endStation.id);
    }
  } else if (endStation && startId && endStation.id !== startId) {
    let lineId = state.drawing.lineId;

    if (!lineId) {
      lineId = getAvailableLine(state)?.id ?? null;
    }

    if (lineId) {
      const line = state.lines[lineId];
      if (line && !line.stationIds.includes(endStation.id)) {
        addStationToLine(state, lineId, endStation.id, startId);
      }
    }
  }

  state.drawing.isDrawing = false;
  state.drawing.startStationId = null;
  state.drawing.lineId = null;
  state.drawing.insertAfterIndex = null;
  state.drawing.grabPos = null;
  state.drawing.mousePos = { x: 0, y: 0 };
}
