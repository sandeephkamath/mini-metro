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
  STATION_INITIAL_CAPACITY: 6,
  STATION_RADIUS: 14,

  // New stations spawn within a rectangle centered on the map, whose half-extents
  // grow from these minimums (a tight radius around the starting cluster) up to
  // the full map extents as the station count approaches STATION_MAX_COUNT.
  STATION_SPAWN_MIN_HALF_WIDTH: 350,
  STATION_SPAWN_MIN_HALF_HEIGHT: 250,

  BASE_PASSENGER_SPAWN_MS: 7000,
  PASSENGER_SPAWN_INTERVAL_MIN_MS: 2500,
  PASSENGER_SPAWN_RATE_DECAY: 0.85,

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

  WEEK_DURATION_MS: 60000, // also the Milestone Event (Weekly Upgrade) interval

  RISK_TIMER_BASE_MS: 8000, // Grace Duration a station starts with, at session start
  RISK_TIMER_INCREMENT_MS: 4000, // added by a single "More Time" Milestone bonus
  CARRIAGE_CAPACITY_BONUS: 2, // passenger capacity added by attaching a Depot Carriage
  CARRIAGE_GAP: 2, // px gap between a Train's linked carriage boxes
  MILESTONE_BONUS_MODE: 'choice' as const, // 'auto' | 'choice' — see core/progression.md §6.1

  LINE_WIDTH: 6,
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
  } as Record<string, string>,
} as const;
