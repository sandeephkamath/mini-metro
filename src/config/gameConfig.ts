import type { MilestoneBonusMode } from '../types/game';

// Mutated in place (not reassigned) by applyRemoteConfigOverrides at startup — see
// src/firebase/remoteConfig.ts and themes/metro.md §5.1. Every consumer imports this
// same object reference, so overrides land before any of them read a value, without
// needing to touch 29+ call sites.
export const CONFIG = {
  // Native/default design size. Used unscaled whenever the real (rotation-aligned)
  // device viewport is at least this big in both dimensions; also the threshold below
  // which GameCanvas.tsx switches to sizing the canvas dynamically to the real viewport
  // instead (see specs/themes/metro.md §6.1).
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  WORLD_WIDTH: 2400,
  WORLD_HEIGHT: 1800,

  CAMERA_DEFAULT_ZOOM: 1,
  // Multiplier applied to max(viewport_w/WORLD_WIDTH, viewport_h/WORLD_HEIGHT) to derive
  // the actual camera min-zoom per viewport size (src/logic/camera.ts's getCameraMinZoom) —
  // 0.9 reproduces the old flat 0.3 exactly at native 800x600.
  CAMERA_MIN_ZOOM_MARGIN: 0.9,
  CAMERA_MAX_ZOOM: 2.5,
  CAMERA_FIT_PADDING: 120,
  CAMERA_LERP_MS: 800,
  CAMERA_ZOOM_WHEEL_FACTOR: 1.0015,

  STATION_SPAWN_INTERVAL_MS: 15000,
  STATION_MAX_COUNT: 30,
  INITIAL_STATION_COUNT: 3,
  STATION_MARGIN: 70,
  MIN_STATION_DISTANCE: 90,
  MIN_LINE_CLEARANCE: 45, // px a new Station must stay clear of any drawn Line segment
  STATION_INITIAL_CAPACITY: 6,
  STATION_RADIUS: 14,
  STATION_SPAWN_ANIM_MS: 600, // spawn-in fade/scale duration for a newly-created Station
  TRAIN_SPAWN_ANIM_MS: 400, // spawn-in fade/scale duration for a newly-created Train
  CARRIAGE_ATTACH_ANIM_MS: 400, // fade/scale-in duration for a Depot Carriage attaching to a Train, scoped to just that carriage
  PASSENGER_QUEUE_ANIM_MS: 300, // fade/scale-in of a Passenger icon newly added to a Station queue
  PASSENGER_FX_MS: 400, // lifetime of the board/deliver ghost flourish
  // Hit radius for STARTING a drag and for capturing stations into the provisional chain
  // mid-drag (precise — an accidental drag from empty space should never silently grab the
  // wrong station). Screen-space per core §4: scaled by 1/zoom below 1x (worldHitRadius).
  STATION_HIT_RADIUS: 20,
  // Hit radius for COMPLETING a drag (mouseup/touchend) — deliberately more generous than
  // STATION_HIT_RADIUS since release precision is typically worse than the start of a drag
  // (the pointer/finger obscures the target), especially on a scaled-down touch screen.
  // Screen-space per core §4; getStationAt picks the nearest in-range station, so the
  // zoom-scaled radius overlapping two stations resolves to the closer one.
  STATION_DROP_RADIUS: 40,

  // Additional station shapes unlock gradually by week number so new shapes don't
  // all appear at once — circle/triangle/square are available from week 0 (unlisted here).
  // Kept inside the ~6.75-week window before STATION_MAX_COUNT (30) stops new spawns
  // entirely (see STATION_SPAWN_INTERVAL_MS below) — a later shape can't unlock if
  // the station budget is already exhausted.
  STATION_SHAPE_UNLOCK_WEEK: {
    star: 1,
    hexagon: 2,
    plus: 3,
  } as Record<string, number>,

  // New stations spawn within a rectangle centered on the map, whose half-extents
  // grow from these minimums (a tight radius around the starting cluster) up to
  // the MAX half-extents as the station count approaches STATION_MAX_COUNT. The max
  // is deliberately much smaller than the world: the network stays compact (auto-camera
  // never zooms out past ~0.5x at native viewport) and the rest of the world is
  // panning space only — see core §5 / themes/metro.md §5.
  STATION_SPAWN_MIN_HALF_WIDTH: 260,
  STATION_SPAWN_MIN_HALF_HEIGHT: 180,
  STATION_SPAWN_MAX_HALF_WIDTH: 620,
  STATION_SPAWN_MAX_HALF_HEIGHT: 450,
  // A new station must land within this distance of an existing one, so the cluster
  // grows contiguously outward instead of scattering across the spawn box (core §5).
  STATION_MAX_NEIGHBOR_DISTANCE: 240,
  // Ease-in exponent applied to spawn-extent growth (see trySpawnStation) — >1 keeps
  // the box tight for longer, only widening rapidly near STATION_MAX_COUNT, so stations
  // stay close together instead of the map filling with empty gaps early on.
  STATION_SPAWN_GROWTH_EXPONENT: 2,

  BASE_PASSENGER_SPAWN_MS: 5000,
  PASSENGER_SPAWN_INTERVAL_MIN_MS: 1800,
  PASSENGER_SPAWN_RATE_DECAY: 0.85,

  // Each spawn tick, this fraction of eligible stations gains a passenger (not just one).
  // Fraction grows from the base each week and is capped at the max.
  PASSENGER_SPAWN_BATCH_BASE_FRACTION: 0.1,
  PASSENGER_SPAWN_BATCH_GROWTH_RATE: 1.18, // multiplier applied to the fraction once per week
  PASSENGER_SPAWN_BATCH_MAX_FRACTION: 0.75,

  TRAIN_SPEED_PX_PER_SEC: 90,
  STATION_STOP_MS: 1200,
  TRAIN_INITIAL_CAPACITY: 6,

  LINE_COLORS: [
    '#e74c3c',
    '#3498db',
    '#2ecc71',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
    '#e67e22',
  ],
  INITIAL_LINES_UNLOCKED: 3,
  MAX_LINES: 7,
  LINE_UNLOCK_STEP: 3, // additional stations required to unlock each subsequent line

  WEEK_DURATION_MS: 60000,
  DAY_NAMES: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], // cosmetic HUD clock — days per week, cycles within WEEK_DURATION_MS
  MILESTONE_EVENT_WEEKS: 5, // Milestone Event (Weekly Upgrade) fires every this-many weeks, not every week

  RISK_TIMER_BASE_MS: 8000, // Grace Duration for the whole session — fixed, no bonus increases it (core/monetization.md)
  PASSENGER_PATIENCE_LIMIT_MS: 30000, // Patience Duration — a single Passenger waiting this long alone triggers Station at Risk (core/logic.md §3 Node Overflow)
  CARRIAGE_CAPACITY_BONUS: 2, // passenger capacity added by attaching a Depot Carriage
  CARRIAGE_GAP: 2, // px gap between a Train's linked carriage boxes
  MILESTONE_BONUS_MODE: 'choice' as MilestoneBonusMode, // see core/progression.md §6.1

  // Ad-gated monetization (core/monetization.md, metro.md §4.2)
  CONTINUE_LIMIT: 1, // Game-Over Continues available per session
  CONTINUE_RELIEF_FRACTION: 0.5, // fraction of capacity a Continue-relieved Station's queue is cut back to — well under the "approaching" warning threshold (maxCapacity - 1), so relief is a real reprieve, not a value that instantly re-triggers it (metro.md §11 B21)
  SIMULATED_AD_DURATION_MS: 3000, // development stand-in Ad Provider's fixed playback length

  // Leaderboard (core/meta_progression.md §7-8, metro.md §9.6)
  LEADERBOARD_TOP_N: 50, // players shown before falling back to just the player's own rank

  // Decorative in-run backdrop: procedural city (themes/metro.md §7.1) — purely visual.
  // Building density runs on game time; car/churn motion runs on wall-clock time.
  BG_BLOCK_SIZE: 120, // city-block pitch; roads run along block edges
  BG_ROAD_COLOR: '#ede7da',
  BG_BUILDING_COLOR: '#ece4d5',
  BG_CAR_COLOR: '#d9ceba',
  BG_DENSITY_BASE: 0.12, // fraction of blocks with a standing building at week 0
  BG_DENSITY_PER_WEEK: 0.06,
  BG_DENSITY_MAX: 0.55,
  BG_BUILDING_POP_MS: 400, // scale/fade-in on appearance; also the churn fade
  BG_CHURN_CYCLE_MS: 40000, // each standing building blinks out about once per cycle
  BG_CHURN_OFF_MS: 3000,
  BG_CARS_PER_DENSITY: 70, // car count = this × building density (≈8 at week 0, ≈38 at cap)
  BG_CAR_LENGTH: 9,
  BG_CAR_WIDTH: 4,
  BG_CAR_SPEED_PX_PER_SEC: 25, // ±20% per-car jitter

  LINE_WIDTH: 6,
  LINE_BEND_RADIUS: 28, // px of corner-rounding at a Line's bend point — the rest of each leg stays straight
  LINE_HIT_RADIUS: 10, // screen-space per core §4 (scaled by 1/zoom below 1x)
  ENDPOINT_HANDLE_LENGTH: 24,
  ENDPOINT_HANDLE_HIT_RADIUS: 14, // screen-space per core §4 (scaled by 1/zoom below 1x)
  // Multiple end tabs at one station fan apart to at least this angle so each stays
  // an individually grabbable target (core §4) — 40°.
  ENDPOINT_HANDLE_MIN_ANGLE: (40 * Math.PI) / 180,
  TRAIN_WIDTH: 22,
  TRAIN_HEIGHT: 12,
  PASSENGER_DOT_RADIUS: 3,
  OVERFLOW_FLASH_INTERVAL_MS: 400,

  MAX_DT: 100,

  // Picture Collection (core/meta_progression.md §3, themes/metro.md §9.3) — fallback
  // values used until the Firestore-backed pool (§9.3.1) is wired up in a later phase.
  PICTURE_BASE_REQUIREMENT: 20, // Required Progress (Week-units) for Picture 1
  PICTURE_GROWTH_RATE: 1.5, // multiplier applied per subsequent Picture
  PICTURE_TILE_COUNT: 20, // 5×4 grid — also the Collectible Reward's Reveal Step count
  PICTURE_TILE_COLS: 5,
  PICTURE_TILE_ROWS: 4,
  PICTURE_RENDER_WIDTH: 400, // internal resolution the "full" Picture is rendered at once
  PICTURE_RENDER_HEIGHT: 320,
  PICTURE_BG_COLOR: '#f5f0e8',
  PICTURE_WATER_COLOR: '#d9e8f0', // same water tone as the home screen ambient scene (metro.md §9.3)
  PICTURE_LINE_WIDTH: 5,
  PICTURE_STATION_RADIUS: 6,
  PICTURE_INTERCHANGE_RADIUS: 9, // outer ring radius for an interchange station's double-ring
  PICTURE_REVEAL_ANIM_MS: 1200, // metro.md §9.4 — count-up/tile-pop-in duration per Picture segment
  PICTURE_TRAIN_SPEED: 40, // metro.md §9.3.2 — px/s at Picture render resolution
  PICTURE_TRAIN_DWELL_MS: 700, // metro.md §9.3.2 — matches the home screen ambient scene's dwell time
  PICTURE_MAX_WAITING: 3, // metro.md §9.3.2 — max waiting-passenger dots per station
  PICTURE_PASSENGER_SPAWN_MIN_MS: 2500,
  PICTURE_PASSENGER_SPAWN_JITTER_MS: 2500,
  PICTURE_TRAIN_SEATS: 4, // metro.md §9.3.2 — rider dots shown per train (cosmetic only)

  // Scripted tutorial (specs/TUTORIAL.md §7)
  // Gates the auto-run entry point only (specs/TUTORIAL.md §1) — the debug `T` key
  // trigger is unaffected. True for real players; the Playwright harness forces this
  // off by default (specs/testing.md) via the test-only config-override channel in
  // main.tsx, so flows get a clean board instead of the scripted onboarding.
  AUTO_TUTORIAL_ENABLED: true,
  TUTORIAL_RESCUE_WINDOW_MS: 30000, // Risk Timer granted at rescue commit / on skip-safety exit
  TUTORIAL_DEMO_MS: 2000, // how long the clock runs so the player sees the risk arc shrink
  TUTORIAL_PULSE_MS: 1000, // highlight halo pulse period (wall-time driven)
  TUTORIAL_HINT_LOOP_MS: 1500, // gesture-hint dot traversal time (wall-time driven)

  // Player-facing Pause/Play/Fast-Forward HUD control (core/logic.md §6, themes/metro.md §5) —
  // build-time flag, not a player setting. Off by default; flip to true to ship the control.
  PLAYER_SPEED_CONTROLS_ENABLED: false,

  SHAPE_COLORS: {
    circle:   '#e74c3c',
    triangle: '#3498db',
    square:   '#2ecc71',
    star:     '#f1c40f',
    hexagon:  '#9b59b6',
    plus:     '#e67e22',
  } as Record<string, string>,

  // Shared dialog/overlay chrome (themes/metro.md §5) — every modal (Game Over,
  // Weekly Upgrade choice, ad prompts, Collectibles, Leaderboard, Exit confirm) draws
  // from the same palette as the Home Screen (HomeScreen.tsx) instead of a generic
  // white card, so the whole app reads as one theme rather than home screen vs. everything
  // else. UI_PRIMARY_COLOR mirrors the Play button / circle shape color (LINE_COLORS[0]).
  UI_BG_COLOR: '#f5f0e8',
  UI_INK_COLOR: '#2d2d2d',
  UI_MUTED_TEXT_COLOR: '#6b6459',
  UI_PRIMARY_COLOR: '#e74c3c',

  // How long app startup waits for the Remote Config Override fetch (below) before
  // proceeding with pure code defaults — see themes/metro.md §5.1.
  REMOTE_CONFIG_FETCH_TIMEOUT_MS: 3000,
};
