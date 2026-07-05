import type { StationShape } from '../types/game';
import { CONFIG } from '../config/gameConfig';

// circle/triangle/square are always available (week 0); the rest unlock
// gradually per CONFIG.STATION_SHAPE_UNLOCK_WEEK.
export const ALL_SHAPES: StationShape[] = ['circle', 'triangle', 'square', 'star', 'hexagon', 'plus'];

export function getUnlockedShapes(weekNumber: number): StationShape[] {
  return ALL_SHAPES.filter(shape => weekNumber >= (CONFIG.STATION_SHAPE_UNLOCK_WEEK[shape] ?? 0));
}
