export const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  WORLD_WIDTH: 2400,
  WORLD_HEIGHT: 1800,

  CAMERA_DEFAULT_ZOOM: 1,
  CAMERA_MIN_ZOOM: 0.3,
  CAMERA_MAX_ZOOM: 2.5,
  CAMERA_FIT_PADDING: 120,
  CAMERA_LERP_MS: 800,
  CAMERA_ZOOM_WHEEL_FACTOR: 1.0015,

  STATION_SPAWN_INTERVAL_MS: 15000,
  STATION_MAX_COUNT: 20,
  INITIAL_STATION_COUNT: 3,
  STATION_MARGIN: 70,
  MIN_STATION_DISTANCE: 90,
  MIN_LINE_CLEARANCE: 45, // px a new Station must stay clear of any drawn Line segment
  STATION_INITIAL_CAPACITY: 6,
  STATION_RADIUS: 14,

  // Additional station shapes unlock gradually by week number so new shapes don't
  // all appear at once — circle/triangle/square are available from week 0 (unlisted here).
  // Kept inside the ~4.25-week window before STATION_MAX_COUNT (20) stops new spawns
  // entirely (see STATION_SPAWN_INTERVAL_MS below) — a later shape can't unlock if
  // the station budget is already exhausted.
  STATION_SHAPE_UNLOCK_WEEK: {
    star: 1,
    hexagon: 2,
    plus: 3,
  } as Record<string, number>,

  // New stations spawn within a rectangle centered on the map, whose half-extents
  // grow from these minimums (a tight radius around the starting cluster) up to
  // the full map extents as the station count approaches STATION_MAX_COUNT.
  STATION_SPAWN_MIN_HALF_WIDTH: 260,
  STATION_SPAWN_MIN_HALF_HEIGHT: 180,
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

  RISK_TIMER_BASE_MS: 8000, // Grace Duration a station starts with, at session start
  RISK_TIMER_INCREMENT_MS: 4000, // added by a single "More Time" Milestone bonus
  CARRIAGE_CAPACITY_BONUS: 2, // passenger capacity added by attaching a Depot Carriage
  CARRIAGE_GAP: 2, // px gap between a Train's linked carriage boxes
  MILESTONE_BONUS_MODE: 'choice' as const, // 'auto' | 'choice' — see core/progression.md §6.1

  LINE_WIDTH: 6,
  LINE_BEND_RADIUS: 28, // px of corner-rounding at a Line's bend point — the rest of each leg stays straight
  LINE_HIT_RADIUS: 10,
  ENDPOINT_HANDLE_LENGTH: 20,
  ENDPOINT_HANDLE_HIT_RADIUS: 10,
  TRAIN_WIDTH: 22,
  TRAIN_HEIGHT: 12,
  PASSENGER_DOT_RADIUS: 3,
  OVERFLOW_FLASH_INTERVAL_MS: 400,

  MAX_DT: 100,

  SHAPE_COLORS: {
    circle:   '#e74c3c',
    triangle: '#3498db',
    square:   '#2ecc71',
    star:     '#f1c40f',
    hexagon:  '#9b59b6',
    plus:     '#e67e22',
  } as Record<string, string>,
} as const;
