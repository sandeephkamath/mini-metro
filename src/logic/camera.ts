import type { CameraState, GameState, Vec2 } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// The starting station cluster and the camera both anchor on this point, so
// the cluster sits in the middle of the map rather than a corner of it.
export function getMapCenter(): Vec2 {
  return { x: CONFIG.WORLD_WIDTH / 2, y: CONFIG.WORLD_HEIGHT / 2 };
}

export function createInitialCamera(): CameraState {
  const center = getMapCenter();
  return {
    x: center.x,
    y: center.y,
    zoom: CONFIG.CAMERA_DEFAULT_ZOOM,
    autoFit: true,
    isPanning: false,
    panLastScreen: null,
  };
}

export function screenToWorld(state: GameState, screen: Vec2): Vec2 {
  const { camera } = state;
  return {
    x: (screen.x - state.viewport.width / 2) / camera.zoom + camera.x,
    y: (screen.y - state.viewport.height / 2) / camera.zoom + camera.y,
  };
}

// The zoom level at which the whole map just fits the viewport (with a small margin) —
// derived from the actual viewport size rather than a flat constant, so it stays correct
// whether the viewport is native 800x600 or a dynamically-sized mobile canvas (metro.md §5).
// CAMERA_MIN_ZOOM_MARGIN is tuned so this formula reproduces the old flat 0.3 exactly at
// native 800x600 (0.9 * max(800/2400, 600/1800) = 0.3).
function getCameraMinZoom(state: GameState): number {
  const { width, height } = state.viewport;
  return CONFIG.CAMERA_MIN_ZOOM_MARGIN * Math.max(width / CONFIG.WORLD_WIDTH, height / CONFIG.WORLD_HEIGHT);
}

function clampZoom(state: GameState, zoom: number): number {
  return Math.min(CONFIG.CAMERA_MAX_ZOOM, Math.max(getCameraMinZoom(state), zoom));
}

// Keeps the viewport from showing empty space past the world edges when the
// world is larger than what's visible at the current zoom.
function clampCameraToWorld(state: GameState): void {
  const camera = state.camera;
  const halfW = state.viewport.width / (2 * camera.zoom);
  const halfH = state.viewport.height / (2 * camera.zoom);

  camera.x = CONFIG.WORLD_WIDTH <= halfW * 2
    ? CONFIG.WORLD_WIDTH / 2
    : Math.min(CONFIG.WORLD_WIDTH - halfW, Math.max(halfW, camera.x));

  camera.y = CONFIG.WORLD_HEIGHT <= halfH * 2
    ? CONFIG.WORLD_HEIGHT / 2
    : Math.min(CONFIG.WORLD_HEIGHT - halfH, Math.max(halfH, camera.y));
}

// True while every station already sits within the current view (minus padding).
// Auto-fit only needs to move the camera once this goes false — checking this
// first (rather than continuously re-deriving a "best fit" center every tick)
// keeps the camera perfectly still at the start and after each adjustment
// settles, instead of endlessly micro-drifting toward a recomputed centroid.
function allStationsInView(state: GameState, camera: CameraState): boolean {
  const halfW = state.viewport.width / (2 * camera.zoom) - CONFIG.CAMERA_FIT_PADDING;
  const halfH = state.viewport.height / (2 * camera.zoom) - CONFIG.CAMERA_FIT_PADDING;
  for (const s of Object.values(state.stations)) {
    if (Math.abs(s.pos.x - camera.x) > halfW) return false;
    if (Math.abs(s.pos.y - camera.y) > halfH) return false;
  }
  return true;
}

// Auto-fit never zooms in tighter than the default view — it only zooms out
// to keep every station in frame as they spawn farther from the start cluster.
function computeAutoFitTarget(state: GameState): { x: number; y: number; zoom: number } {
  const stations = Object.values(state.stations);
  if (stations.length === 0) {
    return { x: state.viewport.width / 2, y: state.viewport.height / 2, zoom: CONFIG.CAMERA_DEFAULT_ZOOM };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of stations) {
    minX = Math.min(minX, s.pos.x);
    maxX = Math.max(maxX, s.pos.x);
    minY = Math.min(minY, s.pos.y);
    maxY = Math.max(maxY, s.pos.y);
  }

  const pad = CONFIG.CAMERA_FIT_PADDING;
  const bboxW = (maxX - minX) + pad * 2;
  const bboxH = (maxY - minY) + pad * 2;
  const fitZoom = Math.min(state.viewport.width / bboxW, state.viewport.height / bboxH);

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    zoom: clampZoom(state, Math.min(fitZoom, CONFIG.CAMERA_DEFAULT_ZOOM)),
  };
}

export function updateCameraAutoFit(state: GameState, dt: number): void {
  const camera = state.camera;
  if (!camera.autoFit) return;
  if (allStationsInView(state, camera)) return;

  const target = computeAutoFitTarget(state);
  const t = Math.min(1, dt / CONFIG.CAMERA_LERP_MS);
  camera.x += (target.x - camera.x) * t;
  camera.y += (target.y - camera.y) * t;
  camera.zoom += (target.zoom - camera.zoom) * t;
  clampCameraToWorld(state);
}

// Zooms around a screen point (e.g. the cursor) so the world point under it stays put.
export function zoomAtScreenPoint(state: GameState, screenPos: Vec2, factor: number): void {
  const camera = state.camera;
  const before = screenToWorld(state, screenPos);

  camera.zoom = clampZoom(state, camera.zoom * factor);
  camera.x = before.x - (screenPos.x - state.viewport.width / 2) / camera.zoom;
  camera.y = before.y - (screenPos.y - state.viewport.height / 2) / camera.zoom;
  camera.autoFit = false;
  clampCameraToWorld(state);
}

export function panCameraByScreenDelta(state: GameState, dxScreen: number, dyScreen: number): void {
  const camera = state.camera;
  camera.x -= dxScreen / camera.zoom;
  camera.y -= dyScreen / camera.zoom;
  camera.autoFit = false;
  clampCameraToWorld(state);
}
