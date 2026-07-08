// Built-in fallback Picture pool (themes/metro.md §9.3.1) — used until the
// Firestore-backed content source exists. Station positions are hand-authored
// approximations, not surveyed real-world coordinates: an original schematic
// rendering inspired by each system's real layout, not a licensed reproduction.
// Each system's own real-world line colors are used so a Picture reads as that
// specific city rather than a generic octilinear diagram (metro.md §9.3).

export interface PictureStationData {
  pos: { x: number; y: number };
  interchange?: boolean; // rendered as a larger double-ring circle
}

export interface PictureLineData {
  color: string;
  stationIndices: number[]; // indices into PictureCityData.stations, in path order
}

export interface PictureCityData {
  name: string;
  stations: PictureStationData[];
  lines: PictureLineData[];
}

// London Underground (simplified): Central, Circle, Piccadilly, Jubilee.
// Shared interchange hubs: Oxford Circus, Baker Street, King's Cross.
const LONDON: PictureCityData = (() => {
  const stations: PictureStationData[] = [
    { pos: { x: 40, y: 150 } },  // 0 Ealing Broadway
    { pos: { x: 110, y: 150 } }, // 1 White City
    { pos: { x: 200, y: 150 }, interchange: true }, // 2 Oxford Circus
    { pos: { x: 280, y: 150 } }, // 3 Bank
    { pos: { x: 360, y: 140 } }, // 4 Stratford
    { pos: { x: 110, y: 80 } },  // 5 Paddington
    { pos: { x: 180, y: 60 }, interchange: true }, // 6 Baker Street
    { pos: { x: 250, y: 70 }, interchange: true },  // 7 King's Cross
    { pos: { x: 320, y: 110 } }, // 8 Liverpool Street
    { pos: { x: 330, y: 190 } }, // 9 Monument
    { pos: { x: 230, y: 250 } }, // 10 Victoria
    { pos: { x: 140, y: 240 } }, // 11 South Kensington
    { pos: { x: 80, y: 160 } },  // 12 Notting Hill Gate
    { pos: { x: 50, y: 260 } },  // 13 Heathrow
    { pos: { x: 110, y: 220 } }, // 14 Hammersmith
    { pos: { x: 340, y: 40 } },  // 15 Cockfosters
    { pos: { x: 60, y: 40 } },   // 16 Stanmore
    { pos: { x: 250, y: 220 } }, // 17 Waterloo
    { pos: { x: 350, y: 260 } }, // 18 Canary Wharf
  ];
  return {
    name: 'London Underground',
    stations,
    lines: [
      { color: '#DC241F', stationIndices: [0, 1, 2, 3, 4] },        // Central
      { color: '#FFD300', stationIndices: [5, 6, 7, 8, 9, 10, 11, 12, 5] }, // Circle (loop)
      { color: '#003688', stationIndices: [13, 14, 2, 7, 15] },     // Piccadilly
      { color: '#A0A5A9', stationIndices: [16, 6, 17, 18] },        // Jubilee
    ],
  };
})();

// Paris Métro (simplified): Line 1, Line 4, Line 6, Line 13.
// Shared interchange hubs: Concorde, Châtelet, Charles de Gaulle–Étoile.
const PARIS: PictureCityData = (() => {
  const stations: PictureStationData[] = [
    { pos: { x: 40, y: 160 } },  // 0 La Défense
    { pos: { x: 110, y: 150 }, interchange: true }, // 1 Charles de Gaulle–Étoile
    { pos: { x: 180, y: 150 }, interchange: true }, // 2 Concorde
    { pos: { x: 250, y: 150 }, interchange: true }, // 3 Châtelet
    { pos: { x: 320, y: 150 } }, // 4 Bastille
    { pos: { x: 370, y: 140 } }, // 5 Nation
    { pos: { x: 200, y: 30 } },  // 6 Porte de Clignancourt
    { pos: { x: 210, y: 70 } },  // 7 Gare du Nord
    { pos: { x: 230, y: 220 } }, // 8 Saint-Sulpice
    { pos: { x: 220, y: 280 } }, // 9 Porte d'Orléans
    { pos: { x: 90, y: 190 } },  // 10 Trocadéro
    { pos: { x: 100, y: 230 } }, // 11 Bir-Hakeim
    { pos: { x: 180, y: 260 } }, // 12 Denfert-Rochereau
    { pos: { x: 260, y: 250 } }, // 13 Place d'Italie
    { pos: { x: 150, y: 20 } },  // 14 Saint-Denis
    { pos: { x: 140, y: 90 } },  // 15 Place de Clichy
    { pos: { x: 200, y: 190 } }, // 16 Invalides
    { pos: { x: 170, y: 270 } }, // 17 Châtillon
  ];
  return {
    name: 'Paris Métro',
    stations,
    lines: [
      { color: '#FFCE00', stationIndices: [0, 1, 2, 3, 4, 5] },     // Line 1
      { color: '#BE418D', stationIndices: [6, 7, 3, 8, 9] },        // Line 4
      { color: '#82C0A3', stationIndices: [1, 10, 11, 12, 13, 5] }, // Line 6
      { color: '#98D4E2', stationIndices: [14, 15, 2, 16, 17] },    // Line 13
    ],
  };
})();

// Beyond this curated pool, content repeats (index N uses document (N-1) mod
// count) while Required Progress keeps escalating — metro.md §9.3.1.
export const PICTURE_CITY_POOL: PictureCityData[] = [LONDON, PARIS];
