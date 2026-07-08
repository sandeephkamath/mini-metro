# Metro Theme Specification

**Version**: 3.7
**Last updated**: 2026-07-08
**Extends**: `../core/logic.md`, `../core/meta_progression.md`, `../core/monetization.md`

This document defines the Metro theme. It maps core abstract concepts to metro terminology, specifies metro-specific entities and visual rules, and provides all configuration values. Game mechanics not mentioned here follow core/logic.md exactly.

---

## 1. Terminology Mapping

| Core Term | Metro Term |
|-----------|-----------|
| Node | Station |
| Route | Line |
| Carrier | Train |
| Resource | Passenger |
| Milestone Event | Weekly Upgrade |
| Transfer Node | Transfer Station |
| Node type | Station shape |
| Resource destination type | Passenger destination shape |
| Reserve | Depot |
| Reserve Carrier | Depot Train |
| Reserve Carriage | Depot Carriage |
| Overflow Risk | Station at Risk |
| Grace Timer | Risk Timer |

---

## 2. Station Shapes

Stations have one of six shapes. A Passenger's destination shape must differ from the shape of the Station where they are waiting. Only the first three shapes are available at session start — the rest unlock gradually by week number (`core/progression.md` §1.1) so new shapes don't all appear at once.

| Shape | Symbol | Label prefix | Unlock week |
|-------|--------|--------------|-------------|
| Circle | ● | C (e.g. C1, C2) | 0 (start) |
| Triangle | ▲ | T (e.g. T1, T2) | 0 (start) |
| Square | ■ | S (e.g. S1, S2) | 0 (start) |
| Star | ★ | X (e.g. X1, X2) | 1 |
| Hexagon | ⬡ | H (e.g. H1, H2) | 2 |
| Plus | ➕ | U (e.g. U1, U2) | 3 |

Station labels (C1, T2, S3…) are assigned sequentially within each shape in order of creation and are displayed above the station on the canvas.

The first three stations are always placed at fixed positions: one circle, one triangle, one square. New stations spawned after that draw their shape from whichever shapes are currently unlocked, balanced by count (core §2 Node) — see `core/progression.md` §1.1 for the unlock rule and §7 for the per-shape unlock-week values.

---

## 3. Metro Lines

Each Line has a distinct color drawn as a thick stroke on the canvas. Lines are unlocked in color order.

| Slot | Color | Hex |
|------|-------|-----|
| 1 | Red | `#e74c3c` |
| 2 | Blue | `#3498db` |
| 3 | Green | `#2ecc71` |
| 4 | Orange | `#f39c12` |
| 5 | Purple | `#9b59b6` |
| 6 | Teal | `#1abc9c` |
| 7 | Dark orange | `#e67e22` |

3 Lines are unlocked at game start. Each remaining Line unlocks once the Station count grows by the Line unlock step (§5 Configuration Values; `core/progression.md` §4) — Line unlocking never depends on the Weekly Upgrade timer.

---

## 4. Weekly Upgrade

Every 5 Weeks (300 seconds of game time) a Weekly Upgrade fires, granting exactly one of two bonus kinds (`core/logic.md` §3 Milestone Events, `core/progression.md` §6), always free. The Week counter itself still advances every 60 seconds — it drives Passenger spawn decay and the HUD's day/clock indicator independently of the Weekly Upgrade.

- **New Train** — adds a Depot Train.
- **New Carriage** — adds a Depot Carriage.

Metro's Milestone bonus mode is **Choice mode**: the HUD pauses and presents both as options; the player clicks one to resolve it, and the game unpauses immediately after. A brief toast notification then appears in the HUD announcing what was picked, e.g. "Weekly Upgrade: New Train added to the Depot" — no numbered level-up framing; the HUD's Week counter and day-of-week clock badge (§8) already show ongoing survival progress continuously, so the toast doesn't need to repeat it.

Metro no longer has a "More Time" bonus kind — Risk Timer duration is fixed for the whole session (§5 Configuration Values); see §4.2 below for the ad-gated ways to get an extra New Train/New Carriage instead.

### 4.1 Assigning Depot Items

- **Depot Train**: shown as an icon in a Depot tray in the HUD. The player drags it onto any unlocked Line that already has at least one Train to add it there; Trains on that Line re-space evenly per the existing multi-Train rule (`core/logic.md` §2 Carrier).
- **Depot Carriage**: shown alongside Depot Trains in the same tray. The player drags it onto any Train currently in service on any Line to attach it, immediately adding the Depot Carriage capacity bonus (§5 Configuration Values) to that Train's capacity.
- Both kinds of Depot item can be assigned at any time, not only right after being granted — they wait in the Depot tray indefinitely until placed.

### 4.2 Monetization

Metro's concrete instantiation of `../core/monetization.md`. Both paths below grant the same two Depot bonus kinds as the Weekly Upgrade (§4), assigned the same way (§4.1) once granted.

**On-Demand Bonus Request** (`core/monetization.md` §2): a "Get a free Train or Carriage" button sits in the HUD, always available during play whenever the Ad Provider (below) is available. Clicking it presents a confirm prompt ("Watch an ad to get a free Train or Carriage?"); accepting plays the ad, then the player picks New Train or New Carriage exactly as in a Weekly Upgrade (§4), and it's added to the Depot. Declining or closing the prompt leaves everything unchanged. No cap — usable as many times as the player wants, each time gated behind a fresh ad.

**Game-Over Continue** (`core/monetization.md` §3): when a Station's Risk Timer would otherwise expire and end the run, and this session still has a Continue available (§5 Configuration Values), the game instead shows "Station Overflow! Watch an ad to continue?" in place of the game-over screen. Accepting and completing the ad lets the player pick New Train or New Carriage (added to the Depot), then every Station currently at risk has its queue trimmed back under capacity (excess Passengers discarded) and its Risk Timer cleared — play resumes immediately with the score, map, and Week progress untouched. Declining, closing the prompt, or having no Continue left instead shows the normal game-over screen (§8, §9).

**Ad Provider (development stand-in)**: no real ad SDK is integrated yet. Until one is, "watching an ad" is a **Simulated Ad** — a short placeholder screen ("Ad playing…" with a progress bar) that always completes successfully after a fixed duration (§5 Configuration Values). This lets both paths above be built and exercised end-to-end before a real ad SDK is integrated, the same "build against a stand-in first" approach already used for the Leaderboard's debug sign-in (§9.6, `DEBUG.md`). A debug-only toggle (`DEBUG.md` § Debug Ad Availability) can force the Ad Provider unavailable, to test the "no ads available" fail-gracefully path (`core/monetization.md` §6) without a real integration.

---

## 5. Configuration Values

These are the concrete values for the tunable parameters defined abstractly in `../core/progression.md` — see that document for the rules and formulas behind them (spawn decay curve, unlock schedule, effective waiting budget).

| Parameter | Value | Notes |
|-----------|-------|-------|
| Viewport size | 800 × 600 px, or the real device viewport if smaller | Native/default size, used unscaled whenever the real (rotation-aligned) viewport is at least this big in both dimensions; below that, the on-screen canvas is sized to exactly match the real viewport instead of being scaled down — see §6.1 |
| Map size | 2400 × 1800 px | Full space Stations can spawn across — see core §5 Map & Viewport |
| Camera default/starting zoom | 1.0× | Also the ceiling for automatic zoom-out |
| Camera min zoom | 0.9 × max(viewport width ÷ 2400, viewport height ÷ 1800) | Computed from the actual viewport size, not a flat constant — the zoom level at which the whole map just fits the viewport, with a small margin. Equals exactly 0.3× at the native 800 × 600 viewport (unchanged from before) |
| Camera max zoom | 2.5× | Manual zoom-in ceiling |
| Camera auto-fit padding | 120 px | Margin kept around all Stations when auto-fitting |
| Station capacity | 6 passengers | Per station; queue length that triggers Station at Risk |
| Train capacity | 6 passengers | Base; upgradeable via Depot Carriage |
| Train speed | 90 px/s | |
| Station stop duration | 1 200 ms | |
| Station spawn interval | 15 000 ms | First spawn at 15s |
| Station min spacing | 90 px | Between any two stations |
| Station edge margin | 70 px | From canvas edges |
| Max stations | 20 | |
| Initial station count | 3 | The fixed starting cluster |
| Station spawn area, starting size | 520 × 360 px | Rectangle centered on the map a new Station can appear in, right after the initial cluster |
| Station spawn area, maximum size | 1240 × 900 px | Ceiling the spawn area grows toward on an ease-in curve (squared) with Station count — deliberately much smaller than the 2400 × 1800 map (core §5), so the network stays compact and the auto-camera never zooms out past roughly 0.5× at the native viewport; the rest of the map is panning space only |
| Station max neighbor distance | 240 px | A new Station must land within this distance of an existing Station — the cluster grows contiguously outward instead of scattering (core §5) |
| Initial unlocked station shape count | 3 | Circle, Triangle, Square |
| Star unlock week | 1 | |
| Hexagon unlock week | 2 | |
| Plus unlock week | 3 | Must land before the ~4.25-week point Max stations (20) stops new spawns, or a later shape never gets placed |
| Passenger spawn base | 5 000 ms | Tick interval at week 0 |
| Passenger spawn decay | 15% per week | Tick interval multiplied by 0.85 each week |
| Passenger spawn floor | 1 800 ms | Minimum tick interval |
| Passenger spawn batch base fraction | 10% | Share of eligible stations spawned to per tick, at week 0 |
| Passenger spawn batch growth | 18% per week | Batch fraction multiplied by 1.18 each week |
| Passenger spawn batch max fraction | 75% | Maximum share of eligible stations spawned to per tick |
| Week duration | 60 000 ms | Game time |
| Weekly Upgrade (Milestone Event) interval | 5 weeks (300 000 ms) | |
| Initial lines unlocked | 3 of 7 | |
| Line unlock step | 3 stations | Additional Stations required to unlock each subsequent Line |
| Risk Timer base duration | 8 000 ms | How long a Station stays "at risk" before overflow ends the game — fixed for the whole session, no bonus increases it |
| Depot Carriage capacity bonus | +2 passengers | Added to a Train's capacity once attached |
| Milestone bonus mode | Choice | See `core/progression.md` §6.1 |
| Continue Limit (per session) | 1 | Game-Over Continues (`core/monetization.md` §3, §5) available per session, resets every session |
| Simulated Ad duration | 3 000 ms | Development stand-in Ad Provider (§4.2) — fixed playback length before the ad always completes successfully |
| Station spawn animation | 600 ms | Fade/scale-in of a newly-created Station (shrinking gray halo) — §7. Game-time driven, like all animation durations below |
| Train spawn animation | 400 ms | Fade/scale-in of a newly-created Train (initial Line creation or Depot Train placement) — §7 |
| Passenger queue-in animation | 300 ms | Fade/scale-in of a Passenger icon newly added to a Station queue (fresh spawn, transfer alighting from a Train, or debug injection) — §7 |
| Passenger board/deliver flourish | 400 ms | Lifetime of the fading ghost icon left behind when a Passenger boards a Train (shrinks out at the queue area) or is delivered (grows and drifts out at the Station) — §7 |
| Backdrop block size | 120 px | City-block pitch of the decorative backdrop — roads run along block edges, one building slot per block (§7.1) |
| Backdrop palette | roads `#ede7da`, buildings `#ece4d5`, cars `#d9ceba` | Monochrome paper tones within a narrow band of the `#f5f0e8` fill — deliberately far lower contrast than any gameplay element |
| Backdrop building density | 12% of blocks at week 0, +6% per week, capped at 55% | Grows continuously with game time — the city fills in as a run progresses (§7.1) |
| Backdrop building pop animation | 400 ms | Scale/fade-in when a building appears, and the fade for churn out/in |
| Backdrop building churn | blink-out ~once per 40 000 ms, absent for 3 000 ms | Each standing building independently, on its own fixed phase — wall-clock driven, §7.1 |
| Backdrop car count | 70 × building density, rounded | Traffic grows in lockstep with the city — ≈8 at the week-0 density, ≈38 at the density cap |
| Backdrop car size | 9 × 4 px | Oriented along the road |
| Backdrop car speed | 25 px/s ± 20% per car | Slow and unhurried next to Trains (90 px/s) |
| Frame dt cap | 100 ms | Prevents spiral-of-death |
| End marker tab length | 24 px | Projects past the terminal station |
| End marker hit radius | 14 px | For grabbing a specific Line's end |
| End marker min separation | 40° | Multiple end markers at one Station fan apart to at least this angle so each stays grabbable (core §4) |
| Station hit radius | 20 px | For starting a drag, and for capturing Stations into the provisional chain mid-drag (precise — core §4) |
| Station drop radius | 40 px | For completing a drag (more forgiving than starting one — core §4); the nearest in-range Station wins if several are in range |
| Line segment hit radius | 10 px | For grabbing a mid-Line segment (insertion drag) |

All drawing hit radii above (end marker, station hit/drop, line segment) are **screen-space** values per core §4: below 1× camera zoom, the world-space radius grows by 1/zoom so targets keep their intended on-screen size; at or above 1× the base value is used as-is.

---

## 6. Camera Controls

Metro's concrete controls for the abstract Camera behavior in core §5 Map & Viewport.

| Input | Effect |
|-------|--------|
| Scroll wheel / trackpad pinch | Zooms in or out, centered on the cursor position |
| Drag on empty map space (not a Station, Line end, or Line segment) | Pans the Camera |
| One-finger touch drag on empty map space | Same as a mouse drag — pans the Camera. A single touch is otherwise a full equivalent of the mouse for every interaction in §3/§4 (drawing/extending/inserting into Lines) |
| Two-finger pinch | Zooms in or out, centered on the pinch midpoint |
| Two-finger drag (both touches moving together, pinch distance roughly constant) | Pans the Camera by the midpoint's movement — combines with pinch-zoom in the same gesture |

Either input immediately and permanently disables the automatic keep-everything-in-view behavior for the rest of the session.

Touch and mouse are equivalent input methods throughout — nothing in core or this theme distinguishes them. The one exception is the Line-deletion hold gesture (§4-equivalent, HUD legend swatch): touch uses `touchstart`/`touchend`/`touchcancel` in place of `mousedown`/`mouseup`/`mouseleave`, since long-press semantics differ slightly between the two on the web.

### 6.1 Responsive Presentation

The full game (canvas and HUD together) is designed at a fixed size, 800×600, and presented at that size unscaled whenever the real viewport is at least that big; below that, the on-screen canvas is resized to exactly match the real viewport instead of being scaled down, so gameplay is never letterboxed on a small screen:

- On a viewport at least as large as the design size in both dimensions (typical desktop), the game renders at its native size, unscaled.
- On a viewport smaller than the design size in either dimension whose long axis is horizontal (landscape phones, small windows), the canvas is resized to exactly the real viewport's pixel dimensions — filling the screen with zero letterboxing, still right-side-up.
- On a viewport smaller than the design size whose long axis is vertical (portrait phones — the common case, since the design is landscape-shaped), the whole game still rotates 90° to align its own long axis with the viewport's long axis, then the canvas is resized to exactly match that rotated viewport — again with zero letterboxing, rather than scaling a fixed design down to fit inside it. The player sees the game sideways in this case; physically rotating the device to landscape removes the need for this.
- A portrait-shaped viewport that is nonetheless at least as large as the design size in the rotated sense (e.g. a tall desktop window) still rotates, but at native size, unscaled — same as the desktop case above.
- Never scales: either the design's native fixed size is used unscaled, or the canvas is resized to exactly match the real viewport. There is no intermediate scale factor in either case, and the canvas never renders larger than the real viewport.
- Every input method (mouse and touch alike) accounts for whichever of the above is currently active, so a click/tap always lands on the same game-world point the player sees on screen, rotated presentation included.
- "The real viewport" means the device's actual physical screen size in CSS pixels, not whatever the browser's layout viewport claims. Some mobile browsers (e.g. Chrome's "Desktop site" mode, which some large-screen Android phones enable automatically) report an inflated layout viewport and then zoom the whole page out to fit the real screen — a phone's viewport can claim to be desktop-sized while the physical screen is still phone-sized. The viewport-size check is capped at the device's physical screen dimensions so this can't push the game into the native-800×600-unscaled path on a screen too small to show it without shrinking.

---

## 7. Rendering

Drawn back to front each frame, with items 2–11 subject to the Camera transform (world space) and item 12 drawn unscaled on top (screen space):

1. Background fill (`#f5f0e8`)
2. Decorative background layer (procedural city: roads, then buildings, then cars — see §7.1). Purely decorative: nothing in gameplay reads it, it hit-tests nothing, and it must stay far lower contrast than every layer above it
3. Line strokes (colored, thick; between stations that aren't already aligned to a straight or 45° path, drawn as a diagonal run then a straight run — two straight legs, with only a short rounded curve where they meet, not a curve along the whole segment. Trains travel along this same straight-legs-plus-rounded-corner shape, and it's what mid-Line insertion hit-testing checks against, so movement, hit-testing, and what's drawn all agree). Each segment's bend orientation (which end gets the diagonal run) is decided once, at the moment the segment is created, and frozen from then on — drawing, extending, shortening, or deleting other Lines never changes the shape of a segment already on the board. The creation-time choice avoids visual overlap: the candidate's departure legs at each endpoint Station are compared against the *actual drawn legs* (bend included, not the straight station-to-station direction) of every other Line's segments already touching that Station, and if the natural orientation departs within 30° of one, the mirrored orientation — or, for segments with no natural bend, a forced bend — is used when it clears better. In particular, two Lines connecting the same pair of Stations must take mirrored (visibly distinct) paths, never render one exactly on top of the other.
4. Line end markers (colored tab + perpendicular crossbar at each Line terminus — one per Line ending at a Node, independently draggable; multiple markers at one Station fan apart to the min separation angle in §5)
5. Drag preview (only while drawing): the provisional chain drawn solid in the Line's color with the same bend geometry as a committed Line, the dangling leg from the last chained Station to the pointer dashed, and any detachment-marked tail segments of the Line being shortened drawn faded — see core §4
6. Station shapes (white fill, neutral dark border — a Station is never colored by the Lines it belongs to). A newly-created Station fades and scales in over a short spawn animation (a shrinking, fading gray halo behind a shape growing from small to full size) rather than appearing instantly — driven by game time, so it freezes along with everything else while the Game Clock is paused (§6 in core/logic.md; see `research/mini_metro_original_analysis_2_ui_timing.md` §2 for the original's equivalent).
7. Station at Risk indicator (pulsing red glow plus a shrinking countdown arc showing Risk Timer remaining). The HUD's day-of-week clock badge doubles as a global version of this cue: it recolors solid red for as long as any Station anywhere is in Overflow Risk, independent of which Station(s) are currently visible on screen, and reverts as soon as none are.
8. Station labels (C1, T2… above each station)
9. Passenger icons waiting at stations (small black destination shapes). A Passenger newly added to a queue — fresh spawn, a transfer alighting from a Train, or debug injection — fades and scales in over the queue-in duration (§5) instead of popping in. Two short ghost flourishes render in this same layer, both lasting the board/deliver flourish duration (§5): when a Passenger boards a Train, a fading, shrinking ghost of its icon briefly remains at the queue area drifting toward the Station; when a Passenger is delivered, a fading, slightly growing ghost of its icon drifts upward from the Station center. All of these are driven by game time, so they freeze with the Game Clock like the Station spawn animation (item 6).
10. Train rectangles (dark fill, colored border, rotated to direction of travel). A newly-created Train — whether from a Line first connecting two Stations or a Depot Train placement — fades and scales in over the Train spawn animation duration (§5), matching the Station spawn treatment, rather than popping in at full size.
11. Passenger icons inside trains (tiny light destination shapes — light-on-dark against the dark Train body, unlike the dark-on-light icons at Stations, so they stay legible at their small size)
12. Debug overlay (when debug mode is active)

### 7.1 Decorative Background — Procedural City

The in-run map sits on an abstract, procedurally generated city backdrop (item 2 above): the quiet city the metro serves, growing beneath the network as a run progresses. Three parts, drawn in this order:

- **Roads** — thin lines at the block-size pitch (§5), covering exactly the 2400 × 1800 map rectangle and stopping at its edges (so the map's bounds read subtly against the plain fill beyond them). Roads define the city blocks; they are static.
- **Buildings** — every block has one potential building: a flat, monochrome rectangle whose size, inset within the block, and *appearance rank* are pseudorandom but fully determined by the block's coordinates — the same city layout every session. A building stands whenever the current building density (§5) is at or above its rank. Density grows continuously with game time, so buildings pop in one by one, in a fixed order, as the run progresses — an early-week map is sparse, a long run's map is a filled-in city, and a restart returns to the sparse week-0 state. Each appearance animates over the pop duration (§5) rather than snapping in. Standing buildings also churn: each one independently blinks out for the churn absence and back in about once per churn cycle (§5), on its own fixed phase, so the skyline is never fully still.
- **Cars** — small monochrome dashes traveling in straight runs along roads, each in a slightly offset lane (so opposite directions don't overlap), wrapping off one map edge and back in the other. Per-car lane, direction, phase, and speed jitter are pseudorandom but fixed. The car count is proportional to the current building density (§5) — traffic thickens in lockstep with the city filling in.

Rules:

- **Decorative only.** Nothing in gameplay reads the backdrop: Stations may spawn on buildings or roads, Lines cross freely, and it participates in no hit-testing. Removing the layer entirely must change no game behavior.
- **World space, deterministic layout.** The layer is drawn under the Camera transform, so it pans and zooms with the map. Given the same game progress, the city is identical every session — like the fixed starting Stations.
- **Two time bases.** Building density — and therefore each building's appearance, pop animation included — is driven by *game time*: the city's growth pauses with the Game Clock and resumes with it, like the Station spawn animation (item 6). Ambient motion — car movement and building churn — is *wall-clock* driven and does not freeze with the Game Clock: the city stays quietly alive while paused, matching the home screen's ambience.
- **Barely-there, monochrome.** Everything in this layer is drawn in the backdrop palette (§5) — paper tones a shade off the background fill, never a hue that could read as a gameplay color. Motion must be slow and low-contrast enough that it is only noticed when looked for; every gameplay element (Lines, Stations, Passengers, Trains) must remain unambiguously higher contrast than anything in this layer.

---

## 8. Screen States

| Phase | What the player sees |
|-------|---------------------|
| home | Top-level landing phase shown before a run begins — see `home_screen.md` |
| start | Welcome/instructions overlay with a Start button, shown over the fixed starting stations |
| playing | Full canvas + HUD bar (score, Week number, day-of-week/clock indicator showing progress through the current week, Pause/Play/Fast-Forward controls, Depot tray, Line unlock slots — colored for unlocked Lines, dim for locked, On-Demand Bonus button §4.2) + Weekly Upgrade choice popup when a Milestone Event fires (pauses the game, §4) + ad-offer/simulated-ad/bonus-choice popups when the On-Demand Bonus Request is used (§4.2) |
| gameover | Reached only once no Game-Over Continue was available or one was declined/failed (§4.2) — canvas dimmed, game over overlay with final score, Weeks Survived, and restart button, plus Best Weeks Survived / Picture progress — see §9 |

Best Weeks Survived, the current Picture, and the Collection gallery entry point (§9) live on the `home` phase, not the `start` overlay — see `home_screen.md`.

---

## 9. Survival & Collection

Metro's concrete instantiation of `../core/meta_progression.md`.

### 9.1 Weeks Survived Display

- No separate counter is added for this. The HUD's existing Week number text and day-of-week clock badge (§8) already show Weeks Survived continuously and precisely (whole week plus day-of-week progress) during play.
- Final Weeks Survived (core/meta_progression.md §1) is simply that same value — whole week number plus fractional day-of-week progress — read at the moment of Node Overflow.
- The Weekly Upgrade toast (§4) no longer announces a numbered level-up; it just names the bonus granted.

### 9.2 Best Weeks Survived

- Shown on the home screen: "Best: Week 12".
- Shown on the game-over screen: "You survived to Week 8 — Personal Best is Week 12".
- If the just-finished session's Final Weeks Survived exceeds the previous Best Weeks Survived, the game-over screen instead shows a distinct "New Best!" callout.
- These summary lines round down to the whole week reached, matching the HUD's own Week display — the day-of-week fraction isn't shown here, only used internally for Accumulated Progress precision (§9.3).

### 9.3 Picture Collection

Metro's Collectible Reward (core/meta_progression.md §3) is a **Picture**: a rectangular image divided into a fixed grid of tiles.

- **Content & production**: each Picture depicts a real-world metro/transit system (e.g. London Underground, Tokyo Metro, New York City Subway, Paris Métro...). Nothing is a static image file or commissioned artwork — each Picture is **procedurally rendered from a curated per-city dataset** (station positions and line topology, hand-authored once per city — data entry, not art production) using the exact same line/station-shape drawing code the game already uses for live gameplay (octilinear lines, rounded joins, the theme's station shape set), rendered once at a fixed frame to produce the "full" image that tiles then reveal over. Not a licensed reproduction of the real system's actual signage — an original rendering, in the game's own visual language, of that system's real layout.
- Each line in a Picture uses that real system's own real-world line color where iconic/well-known (e.g. the Central line's red), rather than the game's own gameplay Line palette — this is what makes each Picture read as *that specific city* rather than a generic octilinear diagram. Stations render as a single consistent shape (not the gameplay shape set, which encodes destination types that don't apply here), with interchange stations distinguished the way real transit maps conventionally do (e.g. a larger or double-ring circle).
- Tiles reveal in a fixed order (left-to-right, top-to-bottom) as Accumulated Progress crosses each tile's share of the Required Progress: tile K of T total tiles reveals once Accumulated Progress ≥ Required Progress × (K / T).
- The Picture tile grid (T = 20) *is* the Collectible Reward reveal granularity from core/meta_progression.md §3 — one tile equals one Reveal Step. Because of that spec's Minimum Session Contribution guarantee, every completed session reveals at least one new tile of the current Picture, even a session that ends at 0 Weeks Survived. A strong session can reveal several tiles at once (or even complete the Picture and spill into the next one) if its Final Weeks Survived spans more than one tile's worth of progress.
- A completed Picture moves into the permanent Collection, viewable from the home screen (`home_screen.md` § Collectibles Screen); the next Picture begins accumulating immediately, starting from any surplus per core/meta_progression.md §3.

#### 9.3.1 Content Source

The Picture pool is **Firestore-backed and editable without an app update** — the same "Firebase, no dedicated server" architecture as the Leaderboard (§9.6), but for public read-only content rather than per-player writes, so it needs no sign-in and works identically on web and Android.

- Each city is one Firestore document: its station/line dataset (§9.3), display name, an explicit ordering value, and an explicit Required Progress for that entry. Collectible Reward index N is the Nth document by ordering value.
- **Stability**: per core/meta_progression.md §3, an already-reachable entry's dataset and Required Progress must never be edited in place once any player could have Accumulated Progress toward it — adding city #11 is safe at any time; changing city #3 after players have seen it is not. This is an authoring discipline (append new documents, don't rewrite old ones), not something the app enforces.
- **Beyond the curated pool**: once the Collectible Reward index exceeds the number of curated documents, content repeats in the same order (index N uses document `(N - 1) mod document count`), but Required Progress keeps escalating rather than repeating — computed from the fixed-curve formula (core §3) seeded from the last curated entry's own Required Progress as its base. So curated entries can each be hand-tuned individually, while the sequence still keeps getting harder forever beyond however many cities exist.
- **Fetch & cache**: the pool is fetched once per app load, at the same time meta-progression is read (core §6) — on success, the fetched pool is cached locally (alongside the local meta-progression data) for use if a later load has no network. If neither a live fetch nor a local cache is available (first-ever launch, offline, Firestore unreachable), the game falls back to a small built-in default pool (1–2 cities) bundled in the app itself, so the feature is never fully broken — same "fail silent, degrade gracefully" principle as meta-progression persistence (core §6).
- **No player writes**: unlike the Leaderboard, nothing about the Picture pool is ever written by a player's client — Firestore security rules only need to allow public reads, not authenticated writes, for this collection.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture base requirement (fallback) | 20 Week-units | Required Progress for the built-in fallback Picture 1, and the seed base used once the curated pool is exhausted — chosen so a modest ~5-week early session already reveals a meaningful ~25% of it. |
| Picture requirement growth rate | 1.5 | Multiplier per subsequent Picture, applied beyond the curated pool (or wherever a curated entry omits an explicit override) — e.g. 20 → 30 → 45 Week-units |
| Picture tile grid | 5 × 4 (20 tiles) | Reveal granularity — a fixed rendering constant, not part of the Firestore content |

### 9.4 Game-Over Reveal

The game-over screen shows the current Picture's percentage revealed — `Accumulated Progress ÷ Required Progress`, e.g. "25% revealed" for a fresh Picture 1 (20 Week-units required) after a 5-week session — as the headline number, with the raw contribution shown smaller underneath (e.g. "+5 weeks"). The percentage shown is driven by the session's *actual* addition to Accumulated Progress, which may exceed that session's Final Weeks Survived when the Minimum Session Contribution guarantee (core/meta_progression.md §3) applies — e.g. a session that ends at 0 Weeks Survived still shows a nonzero contribution (at least one tile's worth), never "+0 weeks / no change."

**Animated reveal**: rather than appearing as a static end value, the percentage counts up from this session's *starting* percentage (Accumulated Progress before this session's contribution) to its *ending* percentage, while the Picture thumbnail's tiles pop in one by one to match — making it visually obvious that more weeks survived means more of the Picture revealed. If this session's contribution completes the current Picture, the count-up animates through to 100%, the existing "Picture Complete!" celebration plays, and then the same count-up pattern immediately repeats for the next Picture's own starting percentage (nonzero if there was carried-over surplus) — so a single very strong session can visibly animate through more than one Picture in sequence.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture reveal animation duration | ~1.2s per Picture segment | Game-Over Reveal (above) percentage count-up / tile pop-in; a session spanning multiple Pictures plays one segment per Picture, back to back |

### 9.5 Persistence

Metro's concrete instantiation of `../core/meta_progression.md` §6.

- Backing store: the browser's `localStorage`, under a single key.
- Persisted values: Best Weeks Survived, the Collection size (the count of completed Pictures — sufficient to know which Pictures are Complete, since Picture N's image and requirement are both derived from its index, §9.3), and the current Picture's Accumulated Progress.
- Read once on app load, before the home screen renders. Written once at the end of each session, right after that session's Best Weeks Survived and Picture progress updates are computed.
- If `localStorage` is unavailable or its value is missing/unreadable, Metro falls back to the zero state (Best Weeks Survived 0, Picture 1 current, 0 Accumulated Progress, empty Collection) for that load — play is unaffected, only meta-progression fails to persist.

### 9.6 Leaderboard

Metro's concrete instantiation of `../core/meta_progression.md` §7–§8.

- **Identity**: **Google Play Games Services** supplies the player's identity (display name, avatar) used to attribute and label a Leaderboard entry. This only exists inside the Android-packaged build — a plain web-browser session has no Play Games equivalent, so it never has a Leaderboard, regardless of the backend below. There is no separate nickname/account system.
- **Backend**: **Firebase** stores and ranks submitted scores. There is no dedicated server, planned or otherwise — the Android client reads and writes Leaderboard data directly against Firebase, with Firebase's own security rules (not custom server-side logic) as the only gate on what a client is allowed to submit.
- **Availability condition**: the Leaderboard — submission, the game-over rank line, and the home screen's "View Leaderboard" control — exists only when the app is running under the Android wrapper *and* Play Games sign-in has succeeded for this launch. Everywhere else (any web session; an Android session where sign-in didn't succeed), every Leaderboard-related UI element is simply omitted — not shown disabled, not shown with an error, just absent. Best Weeks Survived (§9.2) works identically either way, since it's a purely local value. (Firebase's own SDK runs fine on web too — this gate is entirely about Play Games identity being Android-only, not about Firebase.)
- **Sign-in**: attempted silently, once, on app launch — Play Games sign-in first, using the device's existing Google account, then that identity is used to authorize the Firebase connection. No sign-in prompt or button is ever shown at any point. If either step doesn't succeed (no Google account, Play Games unavailable, player has never used Play Games), the game proceeds normally for that session with the Leaderboard hidden; the next attempt is on the next app launch, not retried mid-session.
- **Development/testing identity**: what the Leaderboard's Firebase backend actually requires is a Firebase-authenticated user — Play Games Sign-In is the *production* way to obtain one, but Firebase's own "Sign in with Google" provider (a browser-compatible popup flow, distinct from Play Games' native Games Sign-In) produces the same kind of Firebase user and works in a plain web browser. This lets the entire Leaderboard — Firestore schema, security rules, submission, rank queries, UI — be built and tested on web well before Android packaging happens. This path is debug-only (`DEBUG.md` § Debug Leaderboard Sign-In) and never reachable by a real player; the availability condition above (Android build + Play Games sign-in) is what every non-debug session follows.
- **Submission**: at the end of every session (the same moment local Best Weeks Survived and Picture progress, §9.2–§9.4, are updated), that session's Final Weeks Survived is written directly to Firebase from the client. Because there's no dedicated server, nothing beyond Firebase's security rules verifies a submission is legitimate — see `memo.md` § Leaderboard for the accepted score-integrity risk this implies.
- **Game-over display**: when available, the game-over screen additionally shows the player's current rank beneath the Best Weeks Survived line, e.g. "#4,382 of 61,203 players". If this session's submission improved the player's rank, this appears alongside the existing "New Best!" callout (§9.2) rather than as a separate celebration.
- **Home screen display**: see `home_screen.md` § Leaderboard.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Leaderboard Top N | 50 | Players shown in the ranked list before falling back to just the player's own rank line |

---

## 10. Known Divergences from Original Mini Metro

| Feature | Original | This version |
|---------|----------|-------------|
| Station shapes | 7+ shapes | 6 shapes (circle/triangle/square from start; star/hexagon/plus unlock by week — §2) |
| Map | Multiple cities | One fixed map |
| River / tunnels | Yes | No |
| Sound | Yes | No |
| Mobile support | Yes | No |
| High score | Persistent leaderboard | Single-device Best Weeks Survived only (§9.2) — no leaderboard, no accounts |
| Creative Mode (post-Game-Over sandbox) | Yes | No |

---

## 11. Bug Log

| ID | Symptom | Root Cause | Rule Fix |
|----|---------|-----------|----------|
| B1 | Only one train visible after delivery | New trains always spawn at same position (progress 0, start of line) | Train staggering rule — see core §3 Carrier |
| B2 | Position jitter mid-game | Sync callback recreated each React render, restarting the RAF loop | Stable callback identity — see core §7 Architecture |
| B3 | Station positions distorted on spawn | Module-level ID counters reset on React re-render, causing ID collisions | ID counters in game state — see core §7 Architecture |
| B4 | Passengers re-board the train that just transferred them | Disembark and board both ran on arrival in the same tick | Board on departure, disembark on arrival — see core §3 Disembarkation |
| B5 | Passengers bounce between two transfer stations | Boarding BFS was unbounded; both endpoints matched via multi-hop | One-hop transfer limit + anti-bounce check — see core §3 Routing |
| B6 | Extending a Route from a Station with multiple Route ends always extended the wrong one (and Stations visually looked "owned" by one color) | `getLineForStation` picked the first Line in iteration order that touched the Station, ignoring which end the player actually dragged from; Station border was tinted by that same first Line | Per-Line end markers with independent hit-testing (`getLineEndpointAt`) — see core §4 Route Drawing Interaction; Station border is now a neutral color |
| B7 | Debug overlay panel and HUD bar overlap, both semi-transparent, producing garbled/unreadable text in the shared top-right area whenever debug mode is on | Canvas-drawn debug panel (`renderDebug.ts`) and the DOM `HUD` bar (`HUD.tsx`) are positioned and drawn by unrelated systems with no coordination between them | Debug panel's top edge now starts below the HUD bar's height (48px) so the two never share pixels — see `DEBUG.md` Debug Overlay. A solid HUD background was rejected: the HUD is DOM-above-canvas, so it would have hidden the panel's header rows entirely |
| B8 | Station overflow could never end the game — the queue could reach exactly `maxCapacity` but the check required strictly exceeding it | Every code path that pushes into a Station's queue (`trySpawnPassenger`, the transfer branch of `disembarkPassengers`, the debug add-passenger handler) gated on `< maxCapacity`, so `checkOverflow`'s `> maxCapacity` test was unreachable | Replaced with the Overflow Risk / Grace Timer state machine — a Station at/over capacity starts a Grace Timer instead of ending the game instantly; expiry while still over capacity ends it — see core/logic.md §3 Node Overflow, core/progression.md §5 |
| B9 | Selecting a Depot Train/Carriage from the HUD while debug mode is on and then clicking a Line/Train did nothing — the selection stayed visually "active" with no way to place it short of Escape or toggling debug off | `onMouseDown` checked `state.debugMode` and routed to the debug popup handler before ever reaching the `selectedReserveItem` branches, so every canvas click was swallowed by debug tooling regardless of a pending Depot selection | Reordered `onMouseDown` so the Reserve-assignment branches are checked first, before the debug-mode branch — Depot placement now works identically whether debug mode is on or off |
| B10 | `reserveCarriers`/`reserveCarriages` could in principle be driven negative by a fast repeated click while a Depot item was selected | The Reserve-assignment branches in `onMouseDown` decremented the count unconditionally on any hit, with no check that a reserve was actually available | Added a `> 0` guard before assigning and decrementing each Reserve count |
| B11 | Holding two different Lines' HUD legend swatches at once with two fingers produced the wrong outcome for both — releasing one early (should cancel) deleted it anyway, while holding the other past the threshold (should delete) got silently cancelled instead | `HUD.tsx`'s hold-to-delete tracking (`holdingLineId` + `holdTimerRef`) was a single shared value, not per-Line — a second swatch's `touchstart` overwrote the first swatch's timer reference, orphaning it | Keyed the hold state per-Line (`Set<string>` + `Map<string, number>`) so concurrent holds on different Lines can't interfere with each other's timer lifecycle — found via the `game-tester` agent's real two-finger touch dispatch, only reachable via multi-touch (impossible with a single mouse) |
| B12 | At high debug speed (4x), the week counter froze one week short (e.g. stuck at "Week 4") right as the first Weekly Upgrade choice appeared, and never advanced afterward even though the game was still running | `nextWeekTime`/`nextMilestoneTime` were both recomputed as `gameTimeMs + DURATION` at the moment each fired, basing the next threshold on the current (per-tick, `MAX_DT`-capped) overshoot rather than the ideal prior boundary. `nextWeekTime`'s overshoot compounds every week, while `nextMilestoneTime` only updates once every `MILESTONE_EVENT_WEEKS` weeks — so by the 5th week, `nextWeekTime` could drift past the still-exact `nextMilestoneTime`, making the milestone fire (and pause the clock via `milestoneChoicePending`) one tick before the week-5 increment ever ran. Only significant at high debug speed, where per-tick overshoot approaches the full `MAX_DT` (100ms); negligible at normal 1x speed | Advance both from their own prior value (`nextWeekTime += WEEK_DURATION_MS`, `nextMilestoneTime += WEEK_DURATION_MS * MILESTONE_EVENT_WEEKS`) instead of from `gameTimeMs`, so both stay exact multiples of `WEEK_DURATION_MS` forever and can never drift apart — `src/logic/gameLoop.ts` |
| B13 | On a phone with Chrome's "Desktop site" mode on (some large-screen Android phones enable it automatically), the game rendered at native 800×600 size shrunk into a small centered box with large empty margins on all sides, instead of filling the screen | `GameCanvas.tsx`'s viewport-size check used `window.innerWidth`/`innerHeight`, which in desktop-site mode report an inflated layout viewport (e.g. ~980px wide) that the browser then zooms out to fit the real screen — so the check saw a viewport "big enough" for the native design when the physical screen was still phone-sized | Capped `winW`/`winH` at `window.screen.width`/`height` (the physical display, unaffected by desktop-site zoom) before the size comparison — see themes/metro.md §6.1 |
| B14 | No player-visible symptom yet (latent) — the dead `canReach` function in `src/logic/passengers.ts` was an unbounded BFS across all connected Lines, unused since `canReachAhead` (`trains.ts`) replaced it with one-hop + anti-bounce rules; any future call site would have silently reintroduced the B5 passenger-bounce bug | Superseded function was left in place instead of being deleted when B5 was fixed | Deleted the function outright (no callers existed in `src/` or `testing/`) |
| B15 | With the game paused via the HUD Pause button, entering debug mode and pressing a speed key (`1`/`2`/`3`) did not resume the clock — contradicting `DEBUG.md` Speed Control ("keyed speeds take precedence over the player's HUD speed selection" while debug mode is on) | `tick()` returned early on `playerPaused` unconditionally, before the debug speed multiplier (applied in `useGameLoop.ts`) could ever matter | The `playerPaused` early-return now only applies while debug mode is off (`src/logic/gameLoop.ts`); debug speed 0 still pauses via its zero dt multiplier, and turning debug mode off hands control back to the player's paused state, exactly as `DEBUG.md` already specified |
| B16 | Drawing or extending a Line visibly re-bent segments of *other*, already-drawn Lines; and two Lines connecting the same pair of Stations rendered pixel-identical paths, so the lower one was invisible and its Train appeared to ride the other Line's track | Bend orientation was recomputed live every frame from current board state (`getSegmentElbow`), so any change to an earlier-drawn Line rippled into later Lines' geometry; and overlap clearance was measured against the straight station→neighbor direction (a proxy), not the other Line's actual drawn legs — for a shared station pair the default-vs-mirrored comparison is exactly symmetric, and the `>` tie-break always kept the default elbow, i.e. the identical path | Each segment's elbow is now chosen once at segment creation and stored on the Line (`MetroLine.elbows`, parallel to segments), frozen thereafter; the creation-time choice compares against other Lines' *stored* legs (elbow-accurate), which makes the same-pair case a decisive 0°-clearance conflict that the mirror wins — see §7 item 3 |
