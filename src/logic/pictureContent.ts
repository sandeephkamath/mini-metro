import { PICTURE_CITY_POOL, type PictureCityData } from '../data/pictureCities';

// Collectible Reward index (1-based) -> Picture content. Beyond the curated pool,
// content repeats in the same order while Required Progress keeps escalating via
// the growth curve in collectibles.ts (themes/metro.md §9.3.1).
export function getPictureForIndex(index: number): PictureCityData {
  return PICTURE_CITY_POOL[(index - 1) % PICTURE_CITY_POOL.length];
}
