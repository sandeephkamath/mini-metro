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

// Tokyo Metro (simplified): Marunouchi, Ginza, Hibiya, Tozai.
// Shared interchange hubs: Otemachi, Ginza, Nihombashi.
const TOKYO: PictureCityData = (() => {
  const stations: PictureStationData[] = [
    { pos: { x: 40, y: 150 } },  // 0 Ogikubo
    { pos: { x: 110, y: 150 } }, // 1 Shinjuku
    { pos: { x: 190, y: 160 } }, // 2 Akasaka-mitsuke
    { pos: { x: 270, y: 150 }, interchange: true }, // 3 Ginza
    { pos: { x: 120, y: 50 } },  // 4 Ikebukuro
    { pos: { x: 250, y: 80 }, interchange: true },  // 5 Otemachi
    { pos: { x: 330, y: 50 } },  // 6 Ueno
    { pos: { x: 230, y: 220 } }, // 7 Kasumigaseki
    { pos: { x: 150, y: 230 } }, // 8 Roppongi
    { pos: { x: 90, y: 220 } },  // 9 Shibuya
    { pos: { x: 40, y: 80 } },   // 10 Nakano
    { pos: { x: 320, y: 130 }, interchange: true }, // 11 Nihombashi
    { pos: { x: 360, y: 40 } },  // 12 Asakusa
    { pos: { x: 60, y: 270 } },  // 13 Naka-meguro
    { pos: { x: 300, y: 190 } }, // 14 Kayabacho
    { pos: { x: 190, y: 60 } },  // 15 Iidabashi
    { pos: { x: 370, y: 150 } }, // 16 Toyocho
  ];
  return {
    name: 'Tokyo Metro',
    stations,
    lines: [
      { color: '#F62E36', stationIndices: [0, 1, 2, 5, 4] },         // Marunouchi
      { color: '#FF9500', stationIndices: [9, 3, 6, 12] },           // Ginza
      { color: '#9CAEB7', stationIndices: [13, 8, 7, 3, 11] },       // Hibiya
      { color: '#009BBF', stationIndices: [10, 15, 5, 11, 14, 16] }, // Tozai
    ],
  };
})();

// New York City Subway (simplified): 1/2/3, 4/5/6, A/C/E, N/Q/R/W.
// Shared interchange hubs: Times Sq-42nd St, Canal St, 59th St-Columbus Circle.
const NYC: PictureCityData = (() => {
  const stations: PictureStationData[] = [
    { pos: { x: 40, y: 40 } },   // 0 Van Cortlandt Park
    { pos: { x: 110, y: 60 } },  // 1 168th St
    { pos: { x: 200, y: 150 }, interchange: true }, // 2 Times Sq-42nd St
    { pos: { x: 200, y: 190 } }, // 3 34th St-Herald Sq
    { pos: { x: 230, y: 220 } }, // 4 Union Sq-14th St
    { pos: { x: 270, y: 270 } }, // 5 Wall St
    { pos: { x: 280, y: 150 } }, // 6 Grand Central-42nd St
    { pos: { x: 240, y: 50 } },  // 7 125th St
    { pos: { x: 150, y: 90 } },  // 8 96th St
    { pos: { x: 300, y: 250 } }, // 9 Atlantic Av-Barclays Ctr
    { pos: { x: 250, y: 290 } }, // 10 Coney Island
    { pos: { x: 250, y: 230 }, interchange: true }, // 11 Canal St
    { pos: { x: 290, y: 240 } }, // 12 Fulton St
    { pos: { x: 150, y: 130 }, interchange: true }, // 13 59th St-Columbus Circle
    { pos: { x: 330, y: 220 } }, // 14 Jay St-MetroTech
    { pos: { x: 340, y: 250 } }, // 15 DeKalb Ave
    { pos: { x: 180, y: 210 } }, // 16 West 4th St
  ];
  return {
    name: 'New York City Subway',
    stations,
    lines: [
      { color: '#EE352E', stationIndices: [0, 1, 8, 13, 2, 3] },     // 1/2/3
      { color: '#00933C', stationIndices: [7, 6, 2, 4, 5] },         // 4/5/6
      { color: '#2850AD', stationIndices: [13, 16, 11, 12, 14] },    // A/C/E
      { color: '#FCCC0A', stationIndices: [10, 9, 15, 11, 2] },      // N/Q/R/W
    ],
  };
})();

// Beyond this curated pool, content repeats (index N uses document (N-1) mod
// count) while Required Progress keeps escalating — metro.md §9.3.1. Order is
// append-only once reachable (core/meta_progression.md §3 Stability) — London
// stays index 0 since it's the pre-seeded ZERO_STATE Picture 1 (metro.md §9.5).
export const PICTURE_CITY_POOL: PictureCityData[] = [LONDON, PARIS, TOKYO, NYC];
