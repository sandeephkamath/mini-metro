import type { GameState, StationShape, Vec2 } from '../types/game';
import { getStationAt, trySpawnStationAt } from '../logic/stations';
import {
  getAvailableLine, getLineEndpointAt, addStationToLine, getSegmentAt, insertStationIntoLine,
  getActiveLineAt, addTrainToLine, addCarriageToTrain,
  chainDrawingStation, getRemainingLineStations, removeStationFromLineEnd,
} from '../logic/lines';
import { getTrainAt } from '../logic/trains';
import { screenToWorld, panCameraByScreenDelta, zoomAtScreenPoint, worldHitRadius } from '../logic/camera';
import { CONFIG } from '../config/gameConfig';
import { ALL_SHAPES } from '../logic/shapes';
import { tutorialAllowedStations, tutorialExtendLineTarget } from '../logic/tutorial';

// Debug popup: one button per shape in a row, each BUTTON_W × BUTTON_H
const BUTTON_W = 30;
const BUTTON_H = 24;
const BUTTON_GAP = 4;

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
// Popups are positioned in screen space (menuPos), but hit-testing/placement
// against game entities must use world space (worldPos), since the camera
// may be zoomed or panned away from identity.
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
            queuedAtMs: state.gameTimeMs,
          });
        }
      } else {
        // place_station_shape
        trySpawnStationAt(state, action.worldPos, hit);
      }
    }
    // Any click (hit or miss) closes the popup
    state.debugAction = null;
    return;
  }

  // Placing station mode: record click position and open shape picker
  if (state.debugPlacingStation) {
    state.debugPlacingStation = false;
    state.debugAction = { type: 'pick_station_shape', menuPos: clampMenu(state, x, y), worldPos: screenToWorld(state, { x, y }) };
    return;
  }

  // Click on a station → open passenger type picker
  const station = getStationAt(state, screenToWorld(state, { x, y }));
  if (station) {
    state.debugAction = { type: 'pick_passenger', stationId: station.id, menuPos: clampMenu(state, x, y - 40) };
  }
}

function clampMenu(state: GameState, x: number, y: number): Vec2 {
  const totalW = ALL_SHAPES.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
  return {
    x: Math.min(x, state.viewport.width - totalW - 4),
    y: Math.max(4, Math.min(y, state.viewport.height - BUTTON_H - 4)),
  };
}

// TUTORIAL.md §5 step 3 detail: during the extendLine step, any mousedown that
// lands near the triangle or star Station captures the drag directly into an
// extension of the original Line — grabbing the real end-tab handle is no
// longer required, "no matter what" the click's precision. Returns whether it
// captured the click; the caller blocks the click either way (TUTORIAL.md §3).
function tryTutorialForceExtend(state: GameState, world: Vec2): boolean {
  const target = tutorialExtendLineTarget(state);
  const t = state.tutorial;
  if (!target || !t?.extraStationId) return false;
  const triangle = state.stations[t.triangleId];
  const star = state.stations[t.extraStationId];
  if (!triangle || !star) return false;

  const hitR = worldHitRadius(state, CONFIG.STATION_HIT_RADIUS);
  const dTri = Math.hypot(world.x - triangle.pos.x, world.y - triangle.pos.y);
  const dStar = Math.hypot(world.x - star.pos.x, world.y - star.pos.y);
  if (dTri > hitR && dStar > hitR) return false;

  state.drawing.isDrawing = true;
  state.drawing.startStationId = t.triangleId;
  state.drawing.insertAfterIndex = null;
  state.drawing.grabPos = null;
  state.drawing.mousePos = world;
  state.drawing.lineId = target.lineId;
  // Started nearer the star than the triangle: seed the path immediately so a
  // click-and-release, or a drag away from star, still ends with star joining
  // the Line — chaining (onMouseMove) only catches Stations the pointer
  // passes over *after* the drag starts, which never includes the one it
  // started on.
  state.drawing.path = dStar <= dTri ? [t.extraStationId] : [];
  state.drawing.detachCount = 0;
  state.drawing.extendEnd = target.extendEnd;
  return true;
}

// ── Regular mouse handlers ─────────────────────────────────────────────────
// Screen coordinates (raw canvas pixels) are converted to world coordinates
// before hitting any game entity, since the camera may be zoomed/panned.
// Clicking empty space (nothing hit) starts a camera pan instead.
export function onMouseDown(state: GameState, canvasX: number, canvasY: number): void {
  if (state.phase !== 'playing') return;
  if (state.milestoneChoicePending) return; // choice popup owns input until resolved

  const world = screenToWorld(state, { x: canvasX, y: canvasY });

  // A Depot item is selected — this click assigns it (or misses and cancels
  // the selection), taking priority over normal line-drawing AND over debug
  // mode (core §2 Reserve). Checked before the debugMode branch so debug
  // tooling never silently swallows a Depot placement click (see themes/metro.md
  // bug log). Guarded by the reserve count so a stale/raced selection can
  // never assign more than was actually granted or drive the count negative.
  if (state.selectedReserveItem === 'carrier') {
    const line = getActiveLineAt(state, world);
    if (line && state.reserveCarriers > 0) {
      addTrainToLine(state, line.id);
      state.reserveCarriers -= 1;
    }
    state.selectedReserveItem = null;
    return;
  }
  if (state.selectedReserveItem === 'carriage') {
    const train = getTrainAt(state, world);
    if (train && state.reserveCarriages > 0) {
      addCarriageToTrain(state, train.id);
      state.reserveCarriages -= 1;
    }
    state.selectedReserveItem = null;
    return;
  }

  // The tutorial suspends debug's click-capture so drags draw Lines — the taught
  // interaction — instead of opening debug popups (specs/TUTORIAL.md §3).
  if (state.debugMode && !state.tutorial) {
    onDebugMouseDown(state, canvasX, canvasY);
    return;
  }

  // TUTORIAL.md §5 step 3 detail: extendLine forces every click near the
  // triangle/star pair into an extension, regardless of handle precision. A
  // miss here (neither Station nearby) falls through to the restriction below,
  // same as the other named-pair steps, rather than being blocked outright —
  // that keeps a genuine blank-space click free to pan the camera.
  if (state.tutorial?.step === 'extendLine' && tryTutorialForceExtend(state, world)) return;

  // TUTORIAL.md §3: on a step instructing one specific drag, only its two
  // named Stations can start or extend anything — a click on a real entity
  // outside that pair does nothing (not even falling back to a camera pan),
  // but a genuine blank-space click still pans normally.
  const restrict = tutorialAllowedStations(state);

  // Grabbing a line's end tab extends (or shortens) that specific line, even if
  // other lines also terminate at the same station.
  const endpoint = getLineEndpointAt(state, world);
  if (endpoint) {
    if (restrict && !restrict.has(endpoint.stationId)) return;
    const line = state.lines[endpoint.lineId];
    state.drawing.isDrawing = true;
    state.drawing.startStationId = endpoint.stationId;
    state.drawing.insertAfterIndex = null;
    state.drawing.grabPos = null;
    state.drawing.mousePos = world;
    state.drawing.lineId = endpoint.lineId;
    state.drawing.path = [];
    state.drawing.detachCount = 0;
    state.drawing.extendEnd = line && line.stationIds[0] === endpoint.stationId ? 'front' : 'back';
    return;
  }

  // Clicking a station's body (not a specific line's end tab) always starts a
  // fresh route — a station is never "owned" by a color. The next free line is
  // reserved right away so the preview draws in its real color (core §4); with
  // no free line the drag previews neutrally and commits nothing.
  const station = getStationAt(state, world, worldHitRadius(state, CONFIG.STATION_HIT_RADIUS));
  if (station) {
    if (restrict && !restrict.has(station.id)) return;
    state.drawing.isDrawing = true;
    state.drawing.startStationId = station.id;
    state.drawing.insertAfterIndex = null;
    state.drawing.grabPos = null;
    state.drawing.mousePos = world;
    state.drawing.lineId = getAvailableLine(state)?.id ?? null;
    state.drawing.path = [station.id];
    state.drawing.detachCount = 0;
    state.drawing.extendEnd = null;
    return;
  }

  const segment = getSegmentAt(state, world);
  if (segment) {
    // Mid-line insertion isn't part of any instructed gesture — blocked outright
    // on a restricted step rather than left to insert into an off-script Line.
    // A genuine miss (no segment under the cursor) still falls through to
    // camera panning below — restriction only blocks touching a real entity.
    if (restrict) return;
    state.drawing.isDrawing = true;
    state.drawing.startStationId = null;
    state.drawing.insertAfterIndex = segment.afterIndex;
    state.drawing.grabPos = world;
    state.drawing.mousePos = world;
    state.drawing.lineId = segment.lineId;
    state.drawing.path = [];
    state.drawing.detachCount = 0;
    state.drawing.extendEnd = null;
    return;
  }

  // Nothing hit — start panning the camera.
  state.camera.isPanning = true;
  state.camera.panLastScreen = { x: canvasX, y: canvasY };
}

export function onMouseMove(state: GameState, canvasX: number, canvasY: number): void {
  if (state.camera.isPanning && state.camera.panLastScreen) {
    const dx = canvasX - state.camera.panLastScreen.x;
    const dy = canvasY - state.camera.panLastScreen.y;
    panCameraByScreenDelta(state, dx, dy);
    state.camera.panLastScreen = { x: canvasX, y: canvasY };
    return;
  }

  if (!state.drawing.isDrawing) return;
  state.drawing.mousePos = screenToWorld(state, { x: canvasX, y: canvasY });

  // Continuous chaining (core §4): passing over a station mid-drag provisionally adds it
  // (or undoes / marks a detachment). Uses the precise hit radius, not the forgiving drop
  // radius, so dragging past an unrelated nearby station doesn't silently capture it.
  // No lineId means no free line was available — nothing could commit, so don't chain.
  if (state.drawing.insertAfterIndex === null && state.drawing.lineId) {
    const station = getStationAt(state, state.drawing.mousePos, worldHitRadius(state, CONFIG.STATION_HIT_RADIUS));
    // TUTORIAL.md §3: a restricted draw step can only ever chain in its own
    // two named Stations — anything else the pointer strays over is ignored.
    const restrict = tutorialAllowedStations(state);
    if (station && (!restrict || restrict.has(station.id))) chainDrawingStation(state, station.id);
  }
}

// Commit everything the gesture built up: detachments first, then chained stations
// attached in order to the dragged end (core §4 "Releasing").
function commitDrawing(state: GameState): void {
  const d = state.drawing;
  if (!d.lineId) return;
  const line = state.lines[d.lineId];
  if (!line) return;
  const stationCountBefore = line.stationIds.length;

  if (line.stationIds.length === 0) {
    // Brand-new line: path[0] is the start station; needs at least one more to exist.
    for (let i = 1; i < d.path.length; i++) {
      addStationToLine(state, d.lineId, d.path[i], d.path[i - 1]);
    }
    if (line.stationIds.length > stationCountBefore) state.audioEvents.push('lineDrawn');
    return;
  }

  if (d.extendEnd === null) return;
  for (let i = 0; i < d.detachCount; i++) {
    removeStationFromLineEnd(state, d.lineId, d.extendEnd);
  }
  let endId = d.extendEnd === 'front' ? line.stationIds[0] : line.stationIds[line.stationIds.length - 1];
  for (const stationId of d.path) {
    addStationToLine(state, d.lineId, stationId, endId);
    endId = stationId;
  }
  if (line.stationIds.length > stationCountBefore) state.audioEvents.push('lineDrawn');
}

export function onMouseUp(state: GameState, canvasX: number, canvasY: number): void {
  if (state.camera.isPanning) {
    state.camera.isPanning = false;
    state.camera.panLastScreen = null;
    return;
  }

  if (!state.drawing.isDrawing) return;

  const world = screenToWorld(state, { x: canvasX, y: canvasY });
  // Wider tolerance than the start/chain radius — completing a drag (core/logic.md §4)
  // forgives a near miss, unlike starting one.
  const endStation = getStationAt(state, world, worldHitRadius(state, CONFIG.STATION_DROP_RADIUS));
  const insertAfterIndex = state.drawing.insertAfterIndex;

  if (insertAfterIndex !== null) {
    if (endStation && state.drawing.lineId) {
      const line = state.lines[state.drawing.lineId];
      if (line && !line.stationIds.includes(endStation.id)) {
        insertStationIntoLine(state, state.drawing.lineId, insertAfterIndex, endStation.id);
        state.audioEvents.push('lineDrawn');
      }
    }
  } else {
    // Catch a final station the move events may have missed (fast flicks, touch lift
    // wobble). Append-only: a release near an already-chained station must never
    // undo or detach anything.
    const restrict = tutorialAllowedStations(state);
    if (endStation && state.drawing.lineId && (!restrict || restrict.has(endStation.id))) {
      const remaining = getRemainingLineStations(state);
      if (!remaining.includes(endStation.id) && !state.drawing.path.includes(endStation.id)) {
        state.drawing.path.push(endStation.id);
      }
    }
    commitDrawing(state);
  }

  state.drawing.isDrawing = false;
  state.drawing.startStationId = null;
  state.drawing.lineId = null;
  state.drawing.insertAfterIndex = null;
  state.drawing.grabPos = null;
  state.drawing.mousePos = { x: 0, y: 0 };
  state.drawing.path = [];
  state.drawing.detachCount = 0;
  state.drawing.extendEnd = null;
}

// Wheel/pinch zoom, centered on the cursor. Disables auto-fit permanently.
export function onWheel(state: GameState, canvasX: number, canvasY: number, deltaY: number): void {
  if (state.phase !== 'playing') return;
  const factor = Math.pow(CONFIG.CAMERA_ZOOM_WHEEL_FACTOR, -deltaY);
  zoomAtScreenPoint(state, { x: canvasX, y: canvasY }, factor);
}
