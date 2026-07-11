# Metro Theme Specification

**Version**: 3.18
**Last updated**: 2026-07-11
**Extends**: `../core/logic.md`, `../core/meta_progression.md`, `../core/monetization.md`, `../core/analytics.md`

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
| Patience Duration | Passenger Patience Limit |

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

- **Depot Train**: shown as an icon in a Depot tray in the HUD, drawn in the same visual language as an in-game Train (§7 item 10 — rounded-carriage shapes, coupled) rather than a generic pictograph, so the icon reads as "a Train" at a glance. The player drags it onto any unlocked Line that already has at least one Train to add it there; Trains on that Line re-space evenly per the existing multi-Train rule (`core/logic.md` §2 Carrier).
- **Depot Carriage**: shown alongside Depot Trains in the same tray, using the same visual language as a single Train carriage (§7 item 10) — one rounded rectangle rather than a coupled pair, so it reads as "one carriage" distinct from the Train icon. The player drags it onto any Train currently in service on any Line to attach it, immediately adding the Depot Carriage capacity bonus (§5 Configuration Values) to that Train's capacity.
- Both kinds of Depot item can be assigned at any time, not only right after being granted — they wait in the Depot tray indefinitely until placed.

### 4.2 Monetization

Metro's concrete instantiation of `../core/monetization.md`. Both paths below grant the same two Depot bonus kinds as the Weekly Upgrade (§4), assigned the same way (§4.1) once granted.

**On-Demand Bonus Request** (`core/monetization.md` §2): there is no separate, standalone button for this — the Depot tray's own Train/Carriage count buttons (§4.1) double as the trigger. Whenever a count button reads ×0 (nothing in the Depot to place) *and* the Ad Provider (below) is available, clicking that same button presents the confirm prompt ("Watch an ad to get a free Train or Carriage?") instead of doing nothing; accepting plays the ad, then the player picks New Train or New Carriage exactly as in a Weekly Upgrade (§4), and it's added to the Depot. Declining or closing the prompt leaves everything unchanged. Whichever of the two count buttons was clicked makes no difference to the outcome — both offer the same choice afterward. No cap — usable as many times as the player wants, each time gated behind a fresh ad. Once a button's count is above 0, clicking it reverts to its normal Depot-placement behavior (§4.1) — the ad trigger only applies at ×0. If the Ad Provider is unavailable, a ×0 button is simply an inert, disabled button exactly as it would be without this feature at all — no separate affordance lingers, per `core/monetization.md` §6.

**Game-Over Continue** (`core/monetization.md` §3): when a Station's Risk Timer would otherwise expire and end the run, and this session still has a Continue available (§5 Configuration Values), the game instead shows "Station Overflow! Watch an ad to continue?" in place of the game-over screen. Accepting and completing the ad lets the player pick New Train or New Carriage (added to the Depot), then every Station currently at risk has its queue trimmed back under capacity (excess Passengers discarded) and its Risk Timer cleared — play resumes immediately with the score, map, and Week progress untouched. Declining, closing the prompt, or having no Continue left instead shows the normal game-over screen (§8, §9).

**Ad Provider**: which one "watching an ad" actually means is permanently platform-specific, not a temporary stand-in awaiting replacement — AdMob has no web/browser SDK, so there is no single cross-platform provider to converge on.

- **Android**: a real **AdMob** rewarded video ad, served via the native SDK (Google Mobile Ads). The Ad Provider's App ID is declared natively (Android build config, not a web config value); the rewarded ad unit ID is supplied via build-time configuration. Availability (`core/monetization.md` §1 "Failed/unavailable") now concretely means *a rewarded ad is currently pre-loaded and ready to show* — the offer is only ever presented once one is, per the existing fail-gracefully rule. Until real, publisher-specific IDs are configured, Google's own public test App ID and test rewarded ad unit ID are used, which always serve a real (non-monetized) test ad — this is Google's standard mechanism for developing/testing against AdMob without risking policy violations from real ad unit IDs in a dev build, not a Mini-Metro-specific stand-in.
- **Web**: the **Simulated Ad** — a short placeholder screen ("Ad playing…" with a progress bar) that always completes successfully after a fixed duration (§5 Configuration Values). This is web's permanent Ad Provider, not a placeholder for a future web ad SDK integration.

A debug-only toggle (`DEBUG.md` § Debug Ad Availability) can force the Ad Provider unavailable on either platform, to test the "no ads available" fail-gracefully path (`core/monetization.md` §6) without depending on a real ad actually failing to load.

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
| Passenger Patience Limit | 30 000 ms | How long a single Passenger may wait at a Station before that alone triggers Station at Risk, regardless of queue length |
| Train capacity | 6 passengers | Base; upgradeable via Depot Carriage |
| Train speed | 90 px/s | |
| Station stop duration | 1 200 ms | |
| Station spawn interval | 15 000 ms | First spawn at 15s |
| Station min spacing | 90 px | Between any two stations |
| Station edge margin | 70 px | From canvas edges |
| Max stations | 30 | |
| Initial station count | 3 | The fixed starting cluster |
| Station spawn area, starting size | 520 × 360 px | Rectangle centered on the map a new Station can appear in, right after the initial cluster |
| Station spawn area, maximum size | 1240 × 900 px | Ceiling the spawn area grows toward on an ease-in curve (squared) with Station count — deliberately much smaller than the 2400 × 1800 map (core §5), so the network stays compact and the auto-camera never zooms out past roughly 0.5× at the native viewport; the rest of the map is panning space only |
| Station max neighbor distance | 240 px | A new Station must land within this distance of an existing Station — the cluster grows contiguously outward instead of scattering (core §5) |
| Initial unlocked station shape count | 3 | Circle, Triangle, Square |
| Star unlock week | 1 | |
| Hexagon unlock week | 2 | |
| Plus unlock week | 3 | Must land before the ~6.75-week point Max stations (30) stops new spawns, or a later shape never gets placed |
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
| Continue Relief Fraction | 50% | On a completed Game-Over Continue, every at-risk Station's queue is cut back to 50% of its capacity (3 of 6 by default), not merely one under it — real breathing room rather than a value that instantly re-triggers the same warning (`core/monetization.md` §3, §5) |
| Simulated Ad duration | 3 000 ms | Web's Ad Provider (§4.2) — fixed playback length before the ad always completes successfully |
| Station spawn animation | 600 ms | Fade/scale-in of a newly-created Station (shrinking gray halo) — §7. Game-time driven, like all animation durations below |
| Train spawn animation | 400 ms | Fade/scale-in of a newly-created Train (initial Line creation or Depot Train placement) — §7 |
| Carriage attach animation | 400 ms | Fade/scale-in of a Depot Carriage's box the moment it attaches to a Train, scoped to just that carriage — §7 item 10 |
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
| Player Speed Controls enabled | `true` | Whether the HUD's Pause/Play/Fast-Forward control (core §6) is shown at all — the flag itself is a build-time toggle, not a player-facing setting, but the control it gates is a normal player feature. When `false`, the HUD omits the control entirely and the clock always runs at normal speed outside of a Milestone Event Choice. |
| Auto Tutorial Enabled | `true` | Gates only the Tutorial's auto-run-on-first-session entry point (`TUTORIAL.md` §1), not the debug `T` trigger — a build-time flag, not a player-facing setting. Overridable per-session via the test-only local config-override channel (`testing.md`), which is how the automated suite runs with it off by default |
| Remote config fetch timeout | 3 000 ms | How long app startup waits for the Remote Config Override document (§5.1) before proceeding with pure code defaults |
| UI background | `#f5f0e8` | Shared paper/cream tone for every dialog/overlay card (Game Over, Weekly Upgrade choice, ad prompts, Collectibles, Leaderboard, Exit confirm) — matches the Home Screen background so dialogs read as the same theme, not a generic white card |
| UI ink | `#2d2d2d` | Shared primary text/border tone for dialog chrome — matches the Home Screen title color |
| UI muted text | `#6b6459` | Shared secondary/caption text tone for dialog chrome — matches the Home Screen subtitle color |
| UI primary action color | `#e74c3c` | Shared color for a dialog's main call-to-action button (Watch Ad, Retry, tutorial Next/Done, etc.) — matches the Home Screen Play button and the circle shape/first Line color |
| Menu Track volume | 50% | §13 |
| Session Track volume | 40% | §13 — quieter than the Menu Track since it plays continuously behind active play |
| Audio Cue volume | 45–65% per cue | §13 — varies by cue, see table there |
| Audio Cue cooldown | 80 ms | Minimum gap between two plays of the *same* cue, purely to avoid clipping/distortion when several fire in the same instant (core §7) — does not delay or drop the underlying game event, only its sound |
| Privacy Policy URL | Build-config value, blank by default | Shown as a "Privacy Policy" link inside the Home Screen's Settings screen (`home_screen.md` § Settings) — omitted entirely if unset, same fail-gracefully posture as the Firebase/AdMob placeholder config values elsewhere (`memo.md`) |

All drawing hit radii above (end marker, station hit/drop, line segment) are **screen-space** values per core §4: below 1× camera zoom, the world-space radius grows by 1/zoom so targets keep their intended on-screen size; at or above 1× the base value is used as-is.

### 5.1 Remote Config Overrides

Every value in the table above — plus this theme's other config maps referenced elsewhere in this document (Shape Colors §7, Line Colors §3, the Star/Hexagon/Plus unlock weeks in the table above) — is a **code default**, not a hardcoded ceiling. All of them can be overridden from a single Firestore document, fetched once per app load, in the background, without blocking the home screen.

- **Location**: Firestore collection `config`, document `gameConfig` — one document, a flat map from config key name to override value, using this codebase's own `CONFIG` key names (e.g. `TRAIN_SPEED_PX_PER_SEC`, `SHAPE_COLORS`) as the field names.
- **Partial override**: an absent key, an absent document, or a fetch that fails or doesn't resolve within the timeout all fall back to that key's code default individually — this is a per-key partial-override scheme, not all-or-nothing. A document containing only `{ "TRAIN_SPEED_PX_PER_SEC": 120 }` overrides just that one value; everything else stays at its code default.
- **Fetch timing**: starts the moment the app loads, in the background — the `home` phase (§8) renders immediately and is fully interactive without waiting on it. Not re-fetched mid-session, and not re-checked again within that same session. A session's effective config is fixed for its entire lifetime once resolved, so a value can never change out from under a run already in progress.
- **Fetch timeout**: bounded by the Remote config fetch timeout value above. A slow or unreachable Firestore project must never block the game from starting — once the timeout elapses, the pending fetch resolves to pure code defaults exactly as if the document didn't exist, same as a genuinely absent document.
- **Play before the fetch resolves**: since Play is available immediately, a player can click it before the background fetch finishes. When that happens, Play is replaced in place by a themed loading indicator (not a separate screen) until the fetch resolves (or times out), at which point the game starts normally, using whatever config that resolution produced. In the common case — the fetch resolves during the player's first few seconds looking at the home screen — Play behaves exactly as if there were no fetch at all.
- **Public read, no write**: this is public game-balance data, not player data — no sign-in is required to read it (unlike the Leaderboard), and only server-side/console edits are allowed, never a client write (`firestore.rules`) — the same "no admin tool built, edit directly via console" posture as the Picture Collection dataset (§9.3.1).
- **Real dependency, satisfied**: a real Firebase project is wired up (`memo.md` § Remote Config) — real credentials live in a gitignored `.env.local`, not committed. Without one (e.g. a fresh clone with no `.env.local`), every fetch fails immediately and the game runs on pure code defaults, identical to before this feature existed.

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

The full game (canvas and HUD together) is designed at a fixed size, 800×600, and presented at that size unscaled whenever the real viewport is at least that big; below that, the on-screen canvas is resized to exactly match the real viewport instead of being scaled down, so gameplay is never letterboxed on a small screen. Everything in this section describes the fallback used when the runtime can't (or doesn't) guarantee a landscape-shaped viewport on its own — the packaged **Android app locks its Activity to landscape at the OS level** (`android:screenOrientation="sensorLandscape"`, `AndroidManifest.xml`) since landscape is the game's actual required orientation on phones, not just the default, so on Android the device itself is never presented to the WebView in a portrait shape and none of the rotation logic below ever activates (see §11 Bug Log B20). The **web build has no equivalent OS-level lock available** (a browser tab can't be orientation-locked the way a native Activity can), so a portrait-shaped browser window — a real phone browsing the web version, or a narrow desktop window — still needs the rotate-to-fill behavior described here:

- On a viewport at least as large as the design size in both dimensions (typical desktop), the game renders at its native size, unscaled.
- On a viewport smaller than the design size in either dimension whose long axis is horizontal (landscape phones, small windows), the canvas is resized to exactly the real viewport's pixel dimensions — filling the screen with zero letterboxing, still right-side-up.
- On a viewport smaller than the design size whose long axis is vertical (portrait phones — the common case, since the design is landscape-shaped), the whole game still rotates 90° to align its own long axis with the viewport's long axis, then the canvas is resized to exactly match that rotated viewport — again with zero letterboxing, rather than scaling a fixed design down to fit inside it. The player sees the game sideways in this case; physically rotating the device to landscape removes the need for this.
- A portrait-shaped viewport that is nonetheless at least as large as the design size in the rotated sense (e.g. a tall desktop window) still rotates, but at native size, unscaled — same as the desktop case above.
- Never scales: either the design's native fixed size is used unscaled, or the canvas is resized to exactly match the real viewport. There is no intermediate scale factor in either case, and the canvas never renders larger than the real viewport.
- Every input method (mouse and touch alike) accounts for whichever of the above is currently active, so a click/tap always lands on the same game-world point the player sees on screen, rotated presentation included.
- "The real viewport" means the device's actual physical screen size in CSS pixels, not whatever the browser's layout viewport claims. Some mobile browsers (e.g. Chrome's "Desktop site" mode, which some large-screen Android phones enable automatically) report an inflated layout viewport and then zoom the whole page out to fit the real screen — a phone's viewport can claim to be desktop-sized while the physical screen is still phone-sized. The viewport-size check is capped at the device's physical screen dimensions so this can't push the game into the native-800×600-unscaled path on a screen too small to show it without shrinking.
- The Home Screen (`home_screen.md`) shares this same rotated presentation on a portrait-shaped viewport — it is landscape-shaped like the rest of the game, not a separate portrait-friendly layout. It rotates and resizes using the same computed viewport/rotation as the canvas+HUD, so it fills the physical screen with zero letterboxing whether the device is held in portrait or landscape. Its Leaderboard overlay inherits the same rotation since it renders nested inside it. The Game Over card and the Collectibles Screen (both the grid and the Picture Detail View) are unaffected by this — they render upright and full-bleed against the real physical viewport regardless of device orientation, rather than rotating with the rest of the Home Screen (see §11 Bug Log B19 for why the Collectibles Screen specifically was carved out).
- The main canvas's internal pixel buffer is rendered at the device's actual pixel ratio (supersampled), not a flat 1:1 mapping to CSS pixels — otherwise every dimension above (native size or resized-to-viewport) would still render soft/blurry on a HiDPI/Retina screen, the majority of real phones. The buffer is sized at CSS dimensions × device pixel ratio while its on-screen CSS box stays exactly the CSS dimensions computed above, so this is purely a sharpness improvement: it changes nothing about which of the sizing rules above is chosen, and every coordinate a player or the game logic ever reasons about (camera, world positions, click/tap mapping) stays in the same CSS-pixel/world-unit space as before — only the final rasterization is denser.
- The packaged **Android app runs fully immersive**: the status bar and navigation bar are hidden (`MainActivity.java`), so the game occupies the entire physical display, not just the area below/above the system bars. A player can still swipe from a screen edge to reveal the system bars temporarily (they auto-hide again once dismissed rather than staying pinned open); the WebView's own viewport recomputation (this section) already reacts to whatever size that transiently leaves it, so no separate handling is needed there. The web build has no equivalent — a browser tab can't hide its own chrome — so this is Android-only, same scoping as the landscape lock above.

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
10. Train rectangles (dark fill, colored border, rotated to direction of travel). A newly-created Train — whether from a Line first connecting two Stations or a Depot Train placement — fades and scales in over the Train spawn animation duration (§5), matching the Station spawn treatment, rather than popping in at full size. A Depot Carriage attaching to an existing Train gets the same fade/scale-in treatment, over the Carriage attach animation duration (§5), scoped to just that carriage's own box (and its coupling link to the carriage ahead of it) — the rest of the Train and its other carriages are unaffected.
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
| playing | Full canvas + HUD (score — shown with a small passenger-icon glyph beside the number so it reads as "Passengers delivered" rather than an unlabeled count, Week number, day-of-week/clock indicator showing progress through the current week, Depot tray, Line unlock slots — colored for unlocked Lines, dim for locked, and the Pause/Play/Fast-Forward control, shown by default — §5) + Weekly Upgrade choice popup when a Milestone Event fires (pauses the game, §4) + ad-offer/simulated-ad/bonus-choice popups when the On-Demand Bonus Request is used (§4.2). The HUD has no background band of its own — its elements sit directly over the canvas, each self-contained (its own colored badge/button/icon) or dark-on-cream text, rather than the top/bottom strips resting on a shared translucent bar. Reached via Creative Mode (core §3), the HUD additionally shows a small persistent "Creative Mode" badge next to the Week label, so the player always knows Node Overflow can no longer end the session |
| gameover | Reached only once no Game-Over Continue was available or one was declined/failed (§4.2) — canvas dimmed, game over overlay naming which Station overflowed (e.g. "The triangle station overflowed.", by shape — never the debug-only label), final score and Weeks Survived (no Level shown — Level is not a meta-progression metric, per `core/meta_progression.md`), plus Best Weeks Survived / Picture progress (§9). An icon-only corner close control (same pattern as the Collectibles Screen/Detail View, §9.3.2) opens a Return to Home / Cancel confirmation (same shared confirm-dialog shell as the Android Exit confirmation, §8.1) before actually leaving — guards against an accidental tap discarding the summary before it's been read. A separate "Continue in Creative Mode" button (core §3 Creative Mode) resumes `playing` on the exact same board with no confirmation needed — unlike the close control, nothing about it is destructive |

Clicking Play on the `home` phase goes directly to `playing` — there is no intermediate instructions overlay. On a player's first-ever session in this browser, the scripted Tutorial (`TUTORIAL.md`) auto-starts the instant `playing` begins instead of dropping them onto an empty board; every session after that (per `TUTORIAL.md` §8 Persistence) goes straight into normal play. Best Weeks Survived, the current Picture, and the Collection gallery entry point (§9) live on the `home` phase — see `home_screen.md`.

The app starts the one-time Remote Config Override fetch (§5.1) in the background the moment it loads — `home` still renders immediately and is fully usable while it's in flight. The fetch only becomes visible to the player if they click Play before it resolves, at which point §5.1's themed loading indicator appears in place of the Play control until the game actually starts — so a player never sees a game that starts with one config and silently reconfigures itself underneath them, without needing a separate pre-`home` loading screen.

### 8.1 Android Back Button

Android only (the hardware/gesture back action; there is no equivalent to intercept on web, where back navigates browser history as normal). Pressing back never acts immediately — it always opens a confirmation dialog with a primary action / Cancel first; Cancel always just dismisses the dialog with no other effect. This is a single global listener, the same regardless of whether some other overlay (a Weekly Upgrade choice, an ad prompt, the Collectibles Screen, etc.) is open on top of the current Phase (§8) — it does not attempt to close overlays one at a time first. The dialog itself always renders upright, unaffected by the rotated presentation (§6.1), matching the Game Over card (§8).

The dialog's wording and primary action depend on which Phase was active when back was pressed:

| Phase | Message | Primary action |
|-------|---------|-----------------|
| `home` | "Exit game?" | Exit — closes the app |
| `playing`, `gameover` (any sub-state, including Creative Mode) | "Return to main menu?" | Menu — returns to `home` (the same transition the Game Over card's own close control performs, §8), without closing the app |

This matches how the game already treats the two cases everywhere else: `home` is the only phase where "leaving" means leaving the app at all, while every in-run phase's "leave" action goes back to `home` first. A player who wants to fully quit from mid-run presses back twice — once to reach `home` (no data loss either way, since there is no mid-run persistence, `memo.md` § Persistence), once more to actually exit.

---

## 9. Survival & Collection

Metro's concrete instantiation of `../core/meta_progression.md`.

### 9.1 Weeks Survived Display

- No separate counter is added for this. The HUD's existing Week number text and day-of-week clock badge (§8) already show Weeks Survived continuously and precisely (whole week plus day-of-week progress) during play.
- Final Weeks Survived (core/meta_progression.md §1) is simply that same value — whole week number plus fractional day-of-week progress — read at the moment of Node Overflow.
- The Weekly Upgrade toast (§4) no longer announces a numbered level-up; it just names the bonus granted.

### 9.2 Best Weeks Survived

- Shown on the home screen: "Best: Week 12".
- Shown on the game-over screen: "Reached Week 8 · Best: Week 12".
- If the just-finished session's Final Weeks Survived exceeds the previous Best Weeks Survived, the game-over screen instead shows a distinct "New best — Week 12" callout.
- These summary lines round down to the whole week reached, matching the HUD's own Week display — the day-of-week fraction isn't shown here, only used internally for Accumulated Progress precision (§9.3).

### 9.3 Picture Collection

Metro's Collectible Reward (core/meta_progression.md §3) is a **Picture**: a rectangular image divided into a fixed grid of tiles.

- **Content & production**: each Picture depicts a real-world metro/transit system (e.g. London Underground, Tokyo Metro, New York City Subway, Paris Métro...). Nothing is a static image file or commissioned artwork — each Picture is **procedurally rendered from a curated per-city dataset** (station positions and line topology, hand-authored once per city — data entry, not art production) using the exact same line/station-shape drawing code the game already uses for live gameplay (octilinear lines, rounded joins, the theme's station shape set), rendered once at a fixed frame to produce the "full" image that tiles then reveal over. Not a licensed reproduction of the real system's actual signage — an original rendering, in the game's own visual language, of that system's real layout.
- Each line in a Picture uses that real system's own real-world line color where iconic/well-known (e.g. the Central line's red), rather than the game's own gameplay Line palette — this is what makes each Picture read as *that specific city* rather than a generic octilinear diagram. Stations render as a single consistent shape (not the gameplay shape set, which encodes destination types that don't apply here), with interchange stations distinguished the way real transit maps conventionally do (e.g. a larger or double-ring circle).
- A pale water band crosses behind a Picture's lines and stations, echoing the rivers of the original's city maps — the same visual device as the home screen ambient scene's own water band (`home_screen.md` § Ambient metro scene). Purely decorative background, lower contrast than the Picture's own lines/stations, never obscuring them (they draw on top and fully cover it where they cross).
- A Picture's real-world name (e.g. "London Underground") is shown as a label wherever the Picture is displayed large enough to read — the Collectibles Screen's gallery entries and its detail view — but never for a locked "up next" placeholder, which stays a nameless "???" (`home_screen.md` § Collectibles Screen).
- Tiles reveal in a fixed order (left-to-right, top-to-bottom) as Accumulated Progress crosses each tile's share of the Required Progress: tile K of T total tiles reveals once Accumulated Progress ≥ Required Progress × (K / T).
- The Picture tile grid (T = 20) *is* the Collectible Reward reveal granularity from core/meta_progression.md §3 — one tile equals one Reveal Step. Because of that spec's Minimum Session Contribution guarantee, every completed session reveals at least one new tile of the current Picture, even a session that ends at 0 Weeks Survived. A strong session can reveal several tiles at once (or even complete the Picture and spill into the next one) if its Final Weeks Survived spans more than one tile's worth of progress.
- A completed Picture moves into the permanent Collection, viewable via the home screen's View Collectibles icon (`home_screen.md` § Content); the next Picture begins accumulating immediately, starting from any surplus per core/meta_progression.md §3.

#### 9.3.1 Content Source

The Picture pool is **Firestore-backed and editable without an app update** — the same "Firebase, no dedicated server" architecture as the Leaderboard (§9.6), but for public read-only content rather than per-player writes, so it needs no sign-in and works identically on web and Android.

- Each city is one Firestore document: its station/line dataset (§9.3), display name, an explicit ordering value, and an explicit Required Progress for that entry. Collectible Reward index N is the Nth document by ordering value.
- **Document shape (decided)**: the dataset fields mirror the code's own `PictureCityData` shape directly — `stations`, an array of `{ x, y, interchange? }` (interchange omitted or `false` for a normal station), and `lines`, an array of `{ color, stationIndices }` where `stationIndices` is an ordered list of indices into `stations`. No separate encoding was invented for Firestore; a document is just that same structure as JSON, plus the `name`, `order`, and `requiredProgress` fields above it.
- **Stability**: per core/meta_progression.md §3, an already-reachable entry's dataset and Required Progress must never be edited in place once any player could have Accumulated Progress toward it — adding city #11 is safe at any time; changing city #3 after players have seen it is not. This is an authoring discipline (append new documents, don't rewrite old ones), not something the app enforces.
- **Beyond the curated pool**: once the Collectible Reward index exceeds the number of curated documents, content repeats in the same order (index N uses document `(N - 1) mod document count`), but Required Progress keeps escalating rather than repeating — computed from the fixed-curve formula (core §3) seeded from the last curated entry's own Required Progress as its base. So curated entries can each be hand-tuned individually, while the sequence still keeps getting harder forever beyond however many cities exist.
- **Fetch & cache**: the pool is fetched once per app load, at the same time meta-progression is read (core §6) — on success, the fetched pool is cached locally (alongside the local meta-progression data) for use if a later load has no network. If neither a live fetch nor a local cache is available (first-ever launch, offline, Firestore unreachable), the game falls back to a small built-in default pool (4 cities — London, Paris, Tokyo, New York City, `src/data/pictureCities.ts`) bundled in the app itself, so the feature is never fully broken — same "fail silent, degrade gracefully" principle as meta-progression persistence (core §6).
- **No player writes**: unlike the Leaderboard, nothing about the Picture pool is ever written by a player's client — Firestore security rules only need to allow public reads, not authenticated writes, for this collection.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture base requirement (fallback) | 20 Week-units | Required Progress for the built-in fallback Picture 1, and the seed base used once the curated pool is exhausted — chosen so a modest ~5-week early session already reveals a meaningful ~25% of it. |
| Picture requirement growth rate | 1.5 | Multiplier per subsequent Picture, applied beyond the curated pool (or wherever a curated entry omits an explicit override) — e.g. 20 → 30 → 45 Week-units |
| Picture tile grid | 5 × 4 (20 tiles) | Reveal granularity — a fixed rendering constant, not part of the Firestore content |

#### 9.3.2 Animated Presentation

Wherever a Picture is shown large enough to matter — the Game-Over Reveal (§9.4) and the Collectibles Screen's detail view (`home_screen.md` § Collectibles Screen) — it is not a static frame. Each line's simulated trains travel along that line's real station order (the same ordered path data from §9.3's per-city dataset), ping-ponging between the line's ends and dwelling briefly at each station, picking up and dropping off simulated waiting passengers exactly as the home screen's ambient scene does (`home_screen.md` § Ambient metro scene) — the same visual language, reused rather than reinvented. None of this is real core Resource/Route logic — no actual capacity, no real destination shapes (a Picture's stations have no shape concept at all, §9.3) — it's decorative only, purely to make the Picture read as a living map. The home screen itself shows no Picture at all — its View Collectibles control is a plain icon button (`home_screen.md` § Content) — so this presentation applies only within the Collectibles Screen and the Game-Over Reveal.

- **Waiting passengers & riders**: each station slowly accumulates small waiting-passenger dots beside it, cleared (boarding, cosmetically) whenever a train dwells there; boarded riders show as tiny light dots inside the train body until it dwells again, when some are cosmetically dropped off. Always plain circles, matching a Picture's stations (which likewise always render as a single circle shape, not the gameplay shape set, §9.3) — not the ambient scene's own multi-shape cycle, since that would visually imply a destination-shape concept Pictures don't have. Every station and train starts pre-seeded with a random handful of these (rather than empty) the moment the Picture is built, so the scene reads as an already-busy, living network from its very first rendered frame instead of visibly building up over the following several seconds — the same continuous spawn/board cycle then keeps it that way indefinitely for as long as the Picture stays on screen.
- **Masked by reveal**: the animated scene is only visible within tiles that have already been revealed (§9.3) — the same tile-reveal mask already used to composite a partially-revealed Picture now clips a continuously-animated scene instead of a single static rendered frame. An unrevealed tile shows nothing, exactly as before; a revealed tile shows the live scene passing beneath it. As more tiles reveal, more of the moving network becomes visible — the network visibly "comes alive" as the Picture fills in.
- **Where it's animated vs. static**: the Collectibles Screen's grid of thumbnails stays static (unchanged, non-animated `PictureThumbnail`-style rendering) — many Complete Pictures can be on-screen at once there, and animating all of them simultaneously isn't worth the cost. The Game-Over Reveal and the Collectibles Screen's detail view are each large and singular enough to animate. Locked "up next" placeholders are never animated — nothing has been reached yet, so there's no line data to simulate.

Configuration values (independent of both live gameplay's train speed and the home screen ambient scene's own tuning table, since a Picture renders at a different scale than either):

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture train speed | ~40 px/s at Picture render resolution | Tuned to the smaller, denser Picture canvas — not the same value as gameplay or the ambient scene |
| Picture trains per line | 1–2 | Alternates per line, same pattern as the ambient scene — enough to read as "alive" without looking busy at thumbnail size |
| Picture train dwell | ~0.7s | Matches the ambient scene's dwell time |
| Picture max waiting per station | 3 | Matches the ambient scene's own cap |
| Picture passenger spawn interval | ~2.5–5s random | Matches the ambient scene's own interval |
| Picture train seats (rider dots shown) | 4 | Matches the ambient scene's own train capacity for this cosmetic purpose |

### 9.4 Game-Over Reveal

The game-over screen shows the current Picture's percentage revealed — `Accumulated Progress ÷ Required Progress`, e.g. "25% revealed" for a fresh Picture 1 (20 Week-units required) after a 5-week session — as the headline number, with the raw contribution shown smaller underneath (e.g. "+5 weeks"). The percentage shown is driven by the session's *actual* addition to Accumulated Progress, which may exceed that session's Final Weeks Survived when the Minimum Session Contribution guarantee (core/meta_progression.md §3) applies — e.g. a session that ends at 0 Weeks Survived still shows a nonzero contribution (at least one tile's worth), never "+0 weeks / no change."

**Animated reveal**: rather than appearing as a static end value, the percentage counts up from this session's *starting* percentage (Accumulated Progress before this session's contribution) to its *ending* percentage, while the Picture thumbnail's tiles pop in one by one to match — making it visually obvious that more weeks survived means more of the Picture revealed. If this session's contribution completes the current Picture, the count-up animates through to 100%, the existing "Picture Complete!" celebration plays, and then the same count-up pattern immediately repeats for the next Picture's own starting percentage (nonzero if there was carried-over surplus) — so a single very strong session can visibly animate through more than one Picture in sequence. The thumbnail driving this count-up is the animated presentation from §9.3.2 throughout — as tiles pop in, each newly-revealed tile immediately shows the live moving scene, not a static frame.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture reveal animation duration | ~1.2s per Picture segment | Game-Over Reveal (above) percentage count-up / tile pop-in; a session spanning multiple Pictures plays one segment per Picture, back to back |

### 9.5 Persistence

Metro's concrete instantiation of `../core/meta_progression.md` §6.

- Backing store: the browser's `localStorage`, under a single key.
- Persisted values: Best Weeks Survived, the Collection size (the count of completed Pictures — sufficient to know which Pictures are Complete, since Picture N's image and requirement are both derived from its index, §9.3), and the current Picture's Accumulated Progress.
- Read once on app load, before the home screen renders. Written once at the end of each session, right after that session's Best Weeks Survived and Picture progress updates are computed.
- If `localStorage` is unavailable or its value is missing/unreadable, Metro falls back to a zero-progress state for that load — play is unaffected, only meta-progression fails to persist.
- **Temporary override (as of 2026-07-08, revisit before real launch)**: that fallback currently pre-seeds the Collection with Picture 1 (London) already Complete — Best Weeks Survived 0, Picture 2 current, 0 Accumulated Progress, Collection size 1 — rather than a genuinely empty Collection. This is a deliberate short-term deviation from `core/meta_progression.md` §6's literal zero state (empty Collection), done so the Collectibles feature has something to show immediately on a fresh install without requiring a full session first. Only affects sessions with no valid saved data at all (first-ever visit, cleared storage, or a read failure) — anyone with real saved progress is unaffected. Revert `ZERO_STATE.collectionSize` to `0` in `src/storage/metaProgression.ts` to restore the true empty-Collection zero state.

### 9.6 Leaderboard

Metro's concrete instantiation of `../core/meta_progression.md` §7–§8.

- **Identity**: two paths, a production one (Android only) and an interim one.
  - **Production (implemented, Android only)**: **Google Play Games Services** supplies the player's identity (display name), inside the Android-packaged build only. Sign-in is attempted silently, once, on app launch, using the device's existing Google account, with no prompt or button ever shown. If the player has never used Play Games, or the attempt otherwise fails, the game just plays normally with the Leaderboard hidden for that session — same fail-gracefully rule as everywhere else. This is the sole identity source on Android — the interim Sign In icon below never appears there.
  - **Interim (implemented, web only)**: Firebase's own "Sign in with Google" — a browser-compatible popup flow, distinct from Play Games' native Games Sign-In — supplies identity (display name) from whatever Google account the player picks. Triggered by the home screen's "Sign In" icon (`home_screen.md` § Leaderboard), which is only ever shown on web now that Play Games covers Android. There is no separate nickname/account system either way.
- **Backend**: **Firebase** stores and ranks submitted scores. There is no dedicated server, planned or otherwise. On web, the client reads and writes Leaderboard data directly against Firebase via the JS SDK. On Android, the same reads/writes happen natively (Play Games identity is bridged into a native Firebase Auth session via `PlayGamesAuthProvider`, which the JS-side Firebase SDK running inside the WebView has no access to — so leaderboard submission and queries run through the native SDK instead when signed in via Play Games). Either way, Firebase's own security rules (not custom server-side logic) are the only gate on what a client is allowed to submit — identical rules regardless of which SDK the write came through.
- **Availability condition**: the Leaderboard — submission, the game-over rank line, and the home screen's "View Leaderboard" control — exists whenever the current session has a signed-in identity, by either path above. Everywhere else (not yet signed in, sign-in declined/failed), every Leaderboard-related UI element is simply omitted — not shown disabled, not shown with an error, just absent. Best Weeks Survived (§9.2) works identically either way, since it's a purely local value.
- **Sign-in**: the interim (web) path is an explicit, player-initiated click — the home screen's "Sign In" icon opens the Google popup described above; declining or closing it leaves the Leaderboard hidden, same as never having clicked it. Once signed in, that identity holds for the rest of the session (not re-prompted, not re-checked). The production (Android) path differs in kind, not just source, as described above — silent, automatic, no UI.
- **Debug shortcut**: pressing `L` in debug mode (`DEBUG.md` § Debug Leaderboard Sign-In) triggers the same interim popup as the Sign In icon, without needing to click it — purely a testing convenience for the web path, not a separate identity path.
- **Submission**: at the end of every session (the same moment local Best Weeks Survived and Picture progress, §9.2–§9.4, are updated), that session's Final Weeks Survived is written directly to Firebase from the client (JS SDK on web, native SDK on Android — see Backend above). Because there's no dedicated server, nothing beyond Firebase's security rules verifies a submission is legitimate — see `memo.md` § Leaderboard for the accepted score-integrity risk this implies.
- **Game-over display**: when available, the game-over screen additionally shows the player's current rank beneath the Best Weeks Survived line, e.g. "#4,382 of 61,203 players". If this session's submission improved the player's rank, this appears alongside the existing "New best" callout (§9.2) rather than as a separate celebration.
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
| Sound | Licensed/recorded music + SFX | Yes, but procedurally synthesized (§13) rather than licensed/recorded |
| Mobile support | Yes | Yes — touch input, responsive/rotate-to-fill presentation (§6.1), and a real Android app via Capacitor (`memo.md` § Android Packaging) |
| High score | Persistent leaderboard | Single-device Best Weeks Survived (§9.2) plus a real global Leaderboard (§9.6) once signed in — Play Games identity on Android, interim Google Sign-In on web |
| Creative Mode (post-Game-Over sandbox) | Yes | Yes (core §3, §8) — no separate "Continue in Endless" option, since Creative Mode already covers "keep playing, nothing can end it" |

---

## 11. Bug Log

| ID | Symptom | Root Cause | Rule Fix |
|----|---------|-----------|----------|
| B1 | Only one train visible after delivery | New trains always spawn at same position (progress 0, start of line) | Train staggering rule — see core §3 Carrier |
| B2 | Position jitter mid-game | Sync callback recreated each React render, restarting the RAF loop | Stable callback identity — see core §8 Architecture |
| B3 | Station positions distorted on spawn | Module-level ID counters reset on React re-render, causing ID collisions | ID counters in game state — see core §8 Architecture |
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
| B17 | `testing/flows/overflow-gameover.spec.ts` and `restart.spec.ts` both silently started failing (Station overflow never reached `gameover`; phase stayed `playing`) | Not a gameplay regression — both tests predate the ad-gated Game-Over Continue (`core/monetization.md` §3), which now intercepts every overflow with a "Watch an ad to continue?" prompt instead of transitioning straight to `gameover`. Neither test answered that prompt, so they just timed out waiting for a phase change that wasn't coming | Both tests now call a new `forceAdUnavailable()` helper (`testing/helpers/gameDriver.ts`, presses `V` per `DEBUG.md` § Debug Ad Availability) right after entering debug mode, so overflow ends the game unconditionally exactly as it did before monetization existed — keeps these tests focused on core overflow behavior rather than the Continue flow. Any new flow that triggers overflow and expects `gameover` needs the same call |
| B18 | On a real Android phone (both Chrome and the packaged app), the rotated portrait presentation didn't fill the screen exactly as §6.1 requires — a solid gap ("black bar") appeared along one edge while content on the opposite edge (e.g. the Home Screen's sign-in/collectibles icon cluster) was clipped off-screen | `GameCanvas.tsx`'s viewport `recompute()` measured `window.innerWidth`/`innerHeight`, which can lag behind the true visible area while Android Chrome's URL bar asynchronously collapses/expands after page load — and only `window`'s own `resize`/`orientationchange` events triggered a re-measurement, neither of which reliably fires when only the URL bar's height changes, so a stale, undersized viewport could persist indefinitely | `recompute()` now reads `window.visualViewport.width`/`height` first (falling back to `innerWidth`/`innerHeight` when unavailable) — the API built specifically to track the live visible viewport — and also listens for `visualViewport`'s own `resize` event, so a URL-bar collapse/expand corrects the computed viewport immediately instead of waiting for an unrelated `window` resize |
| B19 | On a real portrait Android phone, the Collectibles Screen's title and Picture names were barely legible, and the Picture Detail View's close button and content could clip off-screen | The Collectibles Screen rendered nested inside the Home Screen's rotated wrapper (§6.1), so all of its text rotated 90° along with everything else — browsers can't apply normal subpixel text antialiasing to rotated text, so it rendered visibly thinner/fainter than upright text, not just sideways. Separately, its cards were sized for the rotated presentation's own (landscape-shaped) design space, whose short axis maps to the physical screen's narrow dimension in portrait — leaving little vertical room before content hit the outer `overflow: hidden` boundary | The Collectibles Screen (grid and Picture Detail View alike) now renders upright and full-bleed against the real physical viewport, as a sibling of the rotated stage instead of nested inside it — same treatment as the Game Over card, and for the same reason. Its cards also gained a `min(…, ~90vw/vh)` responsive cap so they scale to fit a narrow phone width now that they're measured against the real (potentially portrait-narrow) viewport instead of the rotated design space |
| B20 | On a real Android phone held in portrait, any modal (Game Over card, Collectibles Screen, Exit confirmation) rendered fully upright while the game board behind it stayed visually rotated 90° — a jarring mismatch, reported as "dialogs shown in portrait even though the game is in landscape" | B19's upright-sibling treatment for these dialogs was a deliberate, evidence-based tradeoff (avoiding rotated-text legibility loss and vw/vh clipping) — but it implicitly assumed a player might genuinely hold the phone in portrait. Landscape is actually the game's required orientation on phones (`memo.md`), so the whole rotate-to-fill system, and B19's carve-out within it, existed only to compensate for an orientation the app was never supposed to present in the first place | Android's Activity is now locked to `sensorLandscape` (`AndroidManifest.xml`) — see §6.1. The WebView is simply never given a portrait-shaped viewport on Android, so `rotated` is always `false` there and neither the rotation transform nor B19's upright-dialog carve-out is ever exercised on Android. B19's fix itself is untouched and still governs the web build's portrait-browser-window fallback, where no OS-level lock is available |
| B21 | Completing a Game-Over Continue visibly "rescued" the run (Grace Timer/red ring gone), but the just-relieved Station immediately showed the *approaching*-overflow glow again, and could re-enter full Overflow Risk almost immediately — giving the player barely any real time to fix their network before the same station threatened to end the game again | `resolveAdBonusChoice` (`src/logic/monetization.ts`) trimmed a Continue-relieved Station's queue to exactly `maxCapacity - 1` — mathematically "under capacity" (satisfying the letter of `core/monetization.md` §3 at the time), but `renderStations.ts`'s "approaching" warning glow triggers at that exact same threshold (`queue.length >= maxCapacity - 1`), so the relief visually (and functionally, for any Station near the Passenger Patience Limit) landed right back on the edge it was just pulled from instead of actually granting slack | Continue relief now cuts the queue back to a theme-configurable fraction of capacity well below either overflow trigger (`Continue Relief Fraction`, 50% by default — `themes/metro.md` §5) rather than one-under, and resets the wait clock (`queuedAtMs`) on every Resource still queued there, so a Resource that was about to breach the Patience Limit doesn't immediately re-arm the same Grace Timer it just escaped — `core/monetization.md` §3 updated to specify this explicitly |
| B22 | Most of the Playwright suite (`overflow-gameover`, `passenger-direct-delivery`, `passenger-transfer-routing`, `restart`, `weekly-upgrade`, plus several mobile flows) started failing on any fresh browser profile — phases/timers the tests waited on never arrived | These flows predate the auto-run Tutorial (`TUTORIAL.md` §1). On a fresh profile (no `tutorialSeen` flag, exactly what a new Playwright browser context always is) `startGame()` now auto-starts the Tutorial, which pauses the Game Clock and owns the board — so debug-driven actions the tests depended on (passenger injection, speed changes, drawing) either did nothing or fought the scripted script, and nothing the tests waited for ever happened | Added a build-time `Auto Tutorial Enabled` config flag (`themes/metro.md` §5, default on) gating just that entry point, plus a new debug-mode key (`U`, `home` phase only — `DEBUG.md` § Debug Auto-Tutorial Override) that arms a one-session-only override `startGame()` reads before the next Play click. Chosen over any bespoke test-only hook so the fix stays within `testing.md` §2's "debug mode is the only sanctioned instrumentation surface" rule. Every flow now calls `testing/helpers/gameDriver.ts`'s `forceAutoTutorialOff` right after navigating and before Play — see `testing.md` §2. A future dedicated tutorial test should simply not call it, relying on the (also-still-true) default |
| B23 | 5 of the `mobile` Playwright project's flows failed on pixel-sampling assertions (`touch-basics` single-finger-drag and two-finger-pan, all 3 `touch-delete-line` tests) — sampled colors came back as plain backdrop instead of the expected Line/Station color, at first glance looking like touch-drawn Lines simply weren't being drawn at all | Harness-only, not a `src/` bug: `testing/helpers/gameDriver.ts`'s `getCanvasPixel`/`getCanvasPixelAtLocal` called `ctx.getImageData()` with canvas-local (CSS-pixel) coordinates directly. `getImageData` reads the backing store in its own pixel space, and the canvas backing store has been supersampled by `devicePixelRatio` since `ac8c5e4` (themes/metro.md §6.1) — a no-op on desktop's DPR 1 default, but on the `mobile` project's DPR-3 device profile every sample landed at the wrong physical pixel, roughly 3x off from the intended CSS-pixel coordinate | Both helpers now scale their sample coordinates by `window.devicePixelRatio` (read inside the `page.evaluate` browser context) before calling `getImageData` — confirmed real touch-drawing was correct all along by re-sampling with the correction applied |
| B24 | On a real Android device, opening the app (cold start) or bringing it back to the foreground from the recent-apps/background state briefly showed a plain dark flash before the actual game content painted, most visible as the letterbox bars either side of the rotated stage | `android/app/src/main/res/values/styles.xml`'s `AppTheme.NoActionBarLaunch` — the only theme ever assigned to `MainActivity` (`AndroidManifest.xml`); `AppTheme.NoActionBar` is dead, unreferenced code — set its window background via the item name `android:background`, which is not a real Android window-theme attribute (the correct one is `android:windowBackground`). With no working window background configured anywhere and no `colors.xml` defining the app's own palette, Android had nothing correct to paint at the native/compositor level for the brief window before the WebView's surface (re)attaches on either a cold start or a resume-from-background, falling back to a default that didn't match the app's actual `#2c2c2c` backdrop (`index.css`) | Added `android/app/src/main/res/values/colors.xml` defining the app's real background tone, and fixed the theme item to the correct `android:windowBackground` attribute so the native window background matches `#2c2c2c` at every redraw, not just once the WebView itself has painted |
| B25 | On a real Android device, bringing the app back to the foreground from the recent-apps/background state briefly showed the whole stage rotated 90° and clipped into a small portrait-shaped rectangle, before it snapped to the correct full-screen landscape presentation a few frames later | B20 declared Android's `sensorLandscape` Activity lock a guarantee that the WebView "is never presented to the WebView in a portrait shape" and so assumed the rotation path in `GameCanvas.tsx`'s `recompute()` could never activate on Android — but that was only ever an assumption about steady state, never enforced in the JS itself. While Android animates the WebView surface back in from its recents-card thumbnail, it briefly reports genuinely portrait-shaped (small, tall) intermediate dimensions mid-unfreeze; `recompute()`'s bare `winH > winW` check took those transitional frames at face value and rotated into them like a real portrait browser window | `recompute()` now short-circuits `portrait` to `false` whenever `Capacitor.isNativePlatform()` is true, making B20's guarantee actually load-bearing in code instead of an unenforced assumption — Android never rotates regardless of what transient viewport dimensions the resume animation reports. The web build's portrait-browser fallback (no native platform, no OS-level lock available) is unaffected |
| B26 | On a real Android device, Home Screen music only ever became audible after the player's first tap (indistinguishable from "starts on tap" even though muted playback began earlier), and it kept looping audibly after the app was backgrounded, never pausing until the track happened to be swapped | `audioManager.ts` treated the packaged Android app the same as a browser tab, initializing `unlocked = false` and waiting for a `pointerdown`/`keydown` gesture to unmute — but Capacitor's `Bridge.java` unconditionally calls `settings.setMediaPlaybackRequiresUserGesture(false)` on its WebView, so the gesture requirement this code was working around doesn't actually exist on Android; separately, nothing ever paused the `<audio>` element on backgrounding — `document.visibilitychange` was already used elsewhere (`useGameLoop.ts`, to reset the clock's delta-time baseline) but never wired to audio | `unlocked` now initializes to `Capacitor.isNativePlatform()`, so native starts fully audible from the first frame with no gesture wait; a new `visibilitychange` listener in `useAudio.ts` calls `audioManager.ts`'s new `pauseMusicForBackground()`/`resumeMusicFromBackground()` to pause the current track the instant the app/tab is hidden and resume it (same track, position, and mute state) the instant it's foregrounded again |
| B27 | On a real Android device (landscape phone, short physical viewport height), the Game Over card's title and its "Continue in Creative Mode" button were both clipped off the top and bottom of the screen — with a Picture Reveal segment showing, the card's real content height exceeded the viewport, and neither edge was reachable | `GameOverScreen.tsx`'s card had no `maxHeight`/`overflowY`, unlike the Collectibles Screen's card (which already learned this lesson — B19). With `alignItems: 'center'` and no scroll, a card taller than the viewport overflows equally above and below its centered position, past the edges of the physical screen itself rather than being clipped by a visible container boundary — invisible and unreachable, not just visually cut | Restructured to the same nested-wrapper pattern already used by `CollectiblesScreen.tsx`: an outer `position: relative` wrapper holds the close button (which stays fixed in the corner rather than scrolling away), and a separate inner content div gets `maxHeight: '90vh'` + `overflowY: 'auto'`, so a card taller than the viewport scrolls internally instead of extending off both edges of the screen |
| B28 | A debug APK built by GitHub Actions and installed on a real device never showed Play Games identity — no "View Leaderboard" button ever appeared, with no error anywhere | `android-apk.yml` ran `./gradlew assembleDebug` on a fresh runner with no persisted debug keystore; Android tooling auto-generates one with a fresh random key pair whenever it's missing, so every CI run produced a debug APK signed with a *different* SHA-1, never matching the one keystore the Play Games Services Android OAuth client in Play Console is actually registered against — any other signing key makes `GamesSignInClient.isAuthenticated()` legitimately resolve false for this game's project, silently, regardless of whether the signed-in Google account has a valid Play Games profile at the OS level. A first fix attempt (writing a stable keystore to `~/.android/debug.keystore` before the build) still produced a different SHA-1 every run — `./gradlew :app:signingReport` revealed why: this runner image's Android SDK resolves the debug keystore at `~/.config/.android/debug.keystore` (an XDG-based path), not the legacy `~/.android/debug.keystore`, so the correctly-written file was simply never read | Added a workflow step that writes the same stable keystore (base64'd into the `ANDROID_DEBUG_KEYSTORE_BASE64` secret, same pattern as the existing `google-services.json` secret) to *both* `~/.android/debug.keystore` and `~/.config/.android/debug.keystore` before `assembleDebug` runs, since which path a given runner-image version actually resolves isn't guaranteed stable |

---

## 12. Analytics & Messaging

Concrete provider choices and event names for `../core/analytics.md`. Both are Android-and-web (Analytics) or Android-only (Messaging) exactly as noted per row — matching the existing pattern of using the Firebase web SDK uniformly across web and the Android WebView (Firestore, Remote Config) versus reaching for a native-only Capacitor plugin only where no web SDK exists at all (AdMob, Play Games).

### 12.1 Analytics Provider

**Firebase Analytics** (`firebase/analytics`, the same Firebase project as Leaderboard/Remote Config), used identically on web and inside the Android WebView — no platform branching. Requires Google Analytics to be linked to the Firebase project for a real `measurementId`; absent that, it falls back to the same `REPLACE_ME` posture as every other Firebase config value (`.env.example`) and every `logGameEvent` call silently no-ops (core §5 Fail Gracefully).

Event names and parameters (core §2 taxonomy, concrete):

| Event | Params |
|---|---|
| `game_start` | — |
| `game_over` | `week_reached`, `score`, `weeks_survived`, `is_new_best`, `game_time_ms` |
| `picture_completed` | `picture_index` |
| `milestone_bonus_chosen` | `bonus_kind` (`carrier`\|`carriage`), `source` (`milestone`\|`ad_bonus`) |
| `ad_requested` | `ad_kind` (`on_demand`) |
| `ad_accepted` | `ad_kind` (`on_demand`\|`continue`) |
| `ad_declined` | `ad_kind` |
| `ad_completed` | `ad_kind` |
| `continue_used` | `continues_remaining` |
| `tutorial_started` | — |
| `tutorial_exited` | `outcome` (`completed`\|`skipped`) |
| `leaderboard_sign_in` | `platform` (`android`\|`web`) |
| `leaderboard_score_submitted` | `weeks_survived` |

### 12.2 Messaging Provider

**Android only**: `@capacitor/push-notifications` (official Capacitor plugin, wraps the native Firebase Cloud Messaging SDK — already available via the `google-services.json` + `google-services` Gradle plugin already in place for the Leaderboard, see §9.6). Registration happens once per session on launch, requests the OS notification permission if not already granted/denied, and on success writes the device token to a public-write, no-read Firestore collection (`pushTokens/{token}`, `firestore.rules`) — mirroring the trust-client posture the Leaderboard and Remote Config already use, since there's no player identity requirement for this step (core §3).

No web equivalent exists yet (would require a service worker + VAPID key, not built). No send-trigger exists anywhere yet either — registration only makes a device reachable for a future notification; nothing currently sends one (core §3, explicitly out of scope).

---

## 13. Audio

Concrete assets and mapping for `../core/logic.md` §7's theme-neutral Background Music / Audio Cues.

**Sourcing.** All music and sound effects are procedurally synthesized (layered sine-wave pads and tones, generated by a one-off script — `scripts/generate-audio.mjs` — rather than recorded/licensed/commissioned), settling the "Asset sourcing" open question in `memo.md` § Audio. Every asset is built from the same C major pentatonic scale (C · D · E · G · A across octaves) specifically so the two Music Tracks and all five Audio Cues sound like one cohesive, non-dissonant soundscape rather than mismatched stock clips — this is also why no other sourcing path (stock/commissioned) was chosen: cohesion across ten-plus assets is easier to guarantee by construction than to shop for.

**Background Music.**

| Track | Used during | Character |
|-------|-------------|-----------|
| Menu Track | `home` phase, `gameover` phase (core §7: neither is "in session") | Slow four-chord pad loop (I–vi–ii(sus)–V in C, voiced from the pentatonic scale only), ~16s loop, breathing attack/release on each chord change |
| Session Track | `playing` phase, including paused/Milestone-Choice/ad-flow sub-states | Same four-chord pad progression plus a quiet plucked arpeggio layer outlining each chord an octave up, giving a touch more forward motion without leaving the Menu Track's harmonic world |

**Audio Cues.** Concrete sound per abstract cue (core §7 table):

| Cue | Sound | Notes |
|-----|-------|-------|
| Node Spawned | Quick two-note "pop" (C5 grace note into C6) | Station spawn |
| Route Committed | Single soft plucked note (G4) | Fires once per completed drag that added at least one Station, not per Station in a multi-station chain |
| Milestone Event | Four-note ascending arpeggio (C5 · E5 · G5 · C6) with a longer tail | Weekly Upgrade, both Auto and Choice modes |
| Overflow Risk Started | Two alternating low tones (A3 · G3) | Deliberately a gentle pulse, not a harsh alarm — matches the "soothing" brief even for a warning |
| Game Over | Three-note descending cadence (G5 · E5 · C5) with a long release on the last note | |

**Asset files & swapping.** Every track/cue is one `.wav` file under `public/audio/` (`music/home.wav`, `music/game.wav`, `sfx/*.wav`), referenced by a single manifest, `src/config/audioConfig.ts`, mapping each theme-neutral key to a `{ src, volume }` pair. Replacing any sound later — a different synth pass, a licensed/commissioned asset, anything — is a matter of dropping a new file under `public/audio/` and pointing the matching manifest entry's `src` at it; nothing else in the codebase references a file path directly.

**Music/Sound controls.** Per core §7, Background Music and Audio Cues have two independent boolean toggles — Music and Sound — rather than one shared mute. Both live inside the Home Screen's **Settings** screen (`home_screen.md` § Settings), reached via a gear icon in the same top-right icon row as Sign In / Collectibles; there is no audio control anywhere in the in-game HUD (removed — a player who wants to change either setting mid-run returns to the Home Screen first, same as any other Settings change). Each toggle is its own boolean, persisted to `localStorage` (`src/storage/audioSettings.ts`, same fail-silent posture as `tutorialSeen.ts`), so both carry across sessions independently. Turning Music off does not pause/restart the current track's position — its volume simply drops to 0 — so re-enabling it resumes in place rather than restarting the loop.

**Autoplay/gesture handling.** Per core §7's closing note, Background Music attempts muted playback immediately whenever a phase's Music Track is selected, without waiting for a gesture — muted autoplay is broadly allowed by browsers, unlike unmuted autoplay. The first pointer/touch/key event anywhere then unmutes whichever track is currently playing. This matters in practice because the player's very first gesture in a session is frequently the Home Screen's own Play button — under a gesture-gated (rather than muted-autoplay) approach, the Menu Track would never actually become audible before that same tap switches it to the Session Track. Audio Cues still wait for that first real gesture before ever firing (a one-shot sound has no "start muted" equivalent), which is unobservable in practice since gameplay itself can't begin before a gesture either. **The packaged Android app skips this whole dance**: Capacitor's Bridge configures its WebView with `setMediaPlaybackRequiresUserGesture(false)`, so there's no gesture requirement to work around there — Background Music (and Audio Cues) start audible from the very first frame (see §11 Bug Log B26).

**Background/foreground handling.** Background Music pauses the instant the app is backgrounded (Android home/recents) or the browser tab is hidden (`document.visibilitychange`, the same signal the game clock already uses), and resumes in place — same track, same position, same mute state — the moment it's foregrounded again. Audio Cues need no equivalent handling: they're one-shot and only ever fire from live gameplay ticks, which are themselves paused while backgrounded.
