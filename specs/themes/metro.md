# Metro Theme Specification

**Version**: 2.0
**Last updated**: 2026-07-05
**Extends**: `../core/logic.md`, `../core/meta_progression.md`

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

Every 5 Weeks (300 seconds of game time) a Weekly Upgrade fires, granting exactly one of three bonus kinds (`core/logic.md` §3 Milestone Events, `core/progression.md` §6). The Week counter itself still advances every 60 seconds — it drives Passenger spawn decay and the HUD's day/clock indicator independently of the Weekly Upgrade.

- **New Train** — adds a Depot Train.
- **New Carriage** — adds a Depot Carriage.
- **More Time** — extends the Risk Timer (§5 Configuration Values) by a fixed amount, immediately, for every Station.

Metro's Milestone bonus mode is **Choice mode**: the HUD pauses and presents all three as options; the player clicks one to resolve it, and the game unpauses immediately after. A brief toast notification then appears in the HUD, announcing the new Level number (core/meta_progression.md §1) alongside what was picked, e.g. "Level 8! New Train added to the Depot" — a Level-up moment rather than a generic notification.

### 4.1 Assigning Depot Items

- **Depot Train**: shown as an icon in a Depot tray in the HUD. The player drags it onto any unlocked Line that already has at least one Train to add it there; Trains on that Line re-space evenly per the existing multi-Train rule (`core/logic.md` §2 Carrier).
- **Depot Carriage**: shown alongside Depot Trains in the same tray. The player drags it onto any Train currently in service on any Line to attach it, immediately adding the Depot Carriage capacity bonus (§5 Configuration Values) to that Train's capacity.
- Both kinds of Depot item can be assigned at any time, not only right after being granted — they wait in the Depot tray indefinitely until placed.

---

## 5. Configuration Values

These are the concrete values for the tunable parameters defined abstractly in `../core/progression.md` — see that document for the rules and formulas behind them (spawn decay curve, unlock schedule, effective waiting budget).

| Parameter | Value | Notes |
|-----------|-------|-------|
| Viewport size | 800 × 600 px | Fixed on-screen canvas size |
| Map size | 2400 × 1800 px | Full space Stations can spawn across — see core §5 Map & Viewport |
| Camera default/starting zoom | 1.0× | Also the ceiling for automatic zoom-out |
| Camera min zoom | 0.3× | Roughly the level at which the whole map fits the viewport |
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
| Station spawn area, full size | Full map minus edge margin | Reached only as Station count approaches Max stations — grows on an ease-in curve (squared) with Station count in between, so the area stays tight through most of the spawn budget and only widens sharply near the end |
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
| Risk Timer base duration | 8 000 ms | How long a Station stays "at risk" before overflow ends the game |
| Risk Timer increment ("More Time" bonus) | 4 000 ms | Added to the Risk Timer, immediately, for every Station, per bonus |
| Depot Carriage capacity bonus | +2 passengers | Added to a Train's capacity once attached |
| Milestone bonus mode | Choice | See `core/progression.md` §6.1 |
| Frame dt cap | 100 ms | Prevents spiral-of-death |
| End marker tab length | 20 px | Projects past the terminal station |
| End marker hit radius | 10 px | For grabbing a specific Line's end |
| Station hit radius | 20 px | For starting a drag (precise — core §4) |
| Station drop radius | 40 px | For completing a drag (more forgiving than starting one — core §4); kept under half of Station min spacing (90px) so it can't overlap two stations at once |

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

The full game (canvas and HUD together) is designed at a fixed size and presented scaled to fit whatever viewport it's actually running in, rather than redesigning the layout per screen size:

- On a viewport at least as large as the design size in both dimensions (typical desktop), the game renders at its native size, unscaled.
- On a smaller viewport whose long axis is horizontal (landscape phones, small windows), the game scales down uniformly (preserving aspect ratio) to fit, still right-side-up.
- On a smaller viewport whose long axis is vertical (portrait phones — the common case, since the design is landscape-shaped), the whole game rotates 90° to align its own long axis with the viewport's long axis, *then* scales to fit — filling far more of a portrait screen than scaling alone would (which would otherwise only ever be limited by the narrow width, leaving most of the screen empty). The player sees the game sideways in this case; physically rotating the device to landscape removes the need for this and returns the game to right-side-up, scaled to fit normally.
- Never scales up past native size — a very large viewport still renders at the design's native size, not stretched larger.
- Every input method (mouse and touch alike) accounts for whichever of the above is currently active, so a click/tap always lands on the same game-world point the player sees on screen, rotated presentation included.

---

## 7. Rendering

Drawn back to front each frame, with items 2–10 subject to the Camera transform (world space) and item 11 drawn unscaled on top (screen space):

1. Background fill (`#f5f0e8`)
2. Line strokes (colored, thick; between stations that aren't already aligned to a straight or 45° path, drawn as a diagonal run then a straight run — two straight legs, with only a short rounded curve where they meet, not a curve along the whole segment. Trains travel along this same straight-legs-plus-rounded-corner shape, and it's what mid-Line insertion hit-testing checks against, so movement, hit-testing, and what's drawn all agree)
3. Line end markers (colored tab + perpendicular crossbar at each Line terminus — one per Line ending at a Node, independently draggable)
4. Drag preview (dashed line to cursor, only while drawing)
5. Station shapes (white fill, neutral dark border — a Station is never colored by the Lines it belongs to). A newly-created Station fades and scales in over a short spawn animation (a shrinking, fading gray halo behind a shape growing from small to full size) rather than appearing instantly — driven by game time, so it freezes along with everything else while the Game Clock is paused (§6 in core/logic.md; see `mini_metro_original_analysis_2_ui_timing.md` §2 for the original's equivalent).
6. Station at Risk indicator (pulsing red glow plus a shrinking countdown arc showing Risk Timer remaining). The HUD's day-of-week clock badge doubles as a global version of this cue: it recolors solid red for as long as any Station anywhere is in Overflow Risk, independent of which Station(s) are currently visible on screen, and reverts as soon as none are.
7. Station labels (C1, T2… above each station)
8. Passenger icons waiting at stations (small black destination shapes)
9. Train rectangles (dark fill, colored border, rotated to direction of travel)
10. Passenger icons inside trains (tiny black destination shapes)
11. Debug overlay (when debug mode is active)

---

## 8. Screen States

| Phase | What the player sees |
|-------|---------------------|
| home | Top-level landing phase shown before a run begins — see `home_screen.md` |
| start | Welcome/instructions overlay with a Start button, shown over the fixed starting stations |
| playing | Full canvas + HUD bar (score, Level number, day-of-week/clock indicator showing progress through the current week, Pause/Play/Fast-Forward controls, Depot tray, Line unlock slots — colored for unlocked Lines, dim for locked) + Weekly Upgrade choice popup when a Milestone Event fires (pauses the game, §4) |
| gameover | Canvas dimmed, game over overlay with final score, Level reached, and restart button, plus Best Level / Picture progress — see §9 |

Best Level Reached, the current Picture, and the Collection gallery entry point (§9) live on the `home` phase, not the `start` overlay — see `home_screen.md`.

---

## 9. Levels & Collection

Metro's concrete instantiation of `../core/meta_progression.md`.

### 9.1 Level Display

- The HUD's Level counter (§8) is the same count as Milestone Events fired this session — no separate mechanic, just the player-facing label (core/meta_progression.md §1).
- The Weekly Upgrade toast announces it — see §4.

### 9.2 Best Level Reached

- Shown on the home screen: "Best: Level 12".
- Shown on the game-over screen: "You reached Level 8 — Personal Best is Level 12".
- If the just-finished session's Final Level exceeds the previous Best Level Reached, the game-over screen instead shows a distinct "New Best!" callout.

### 9.3 Picture Collection

Metro's Collectible Reward (core/meta_progression.md §3) is a **Picture**: a rectangular image divided into a fixed grid of tiles.

- Tiles reveal in a fixed order (left-to-right, top-to-bottom) as Accumulated Progress crosses each tile's share of the Required Progress: tile K of T total tiles reveals once Accumulated Progress ≥ Required Progress × (K / T).
- Pictures are drawn from a curated, finite image pool. Once the Picture sequence advances past the pool's size, images repeat in the same order (Collectible Reward index N uses image `(N - 1) mod pool size`) — later Pictures are distinguished by how hard they are to complete, not by image novelty.
- A completed Picture moves into the permanent Collection gallery, viewable from the home screen; the next Picture begins accumulating immediately, starting from any surplus per core/meta_progression.md §3.

Configuration values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Picture base requirement | 50 Level-units | Required Progress for Picture 1 |
| Picture requirement growth rate | 1.5 | Multiplier per subsequent Picture |
| Picture tile grid | 5 × 4 (20 tiles) | Reveal granularity |
| Picture image pool size | 10 (placeholder) | Repeats once exhausted; adjust once real images are sourced |

### 9.4 Game-Over Reveal

The game-over screen additionally shows this session's contribution to the current Picture, e.g. "+8 → Picture progress: 42/50". If this session's contribution completed the Picture, a "Picture Complete!" celebration is shown before the next Picture's (now-empty) progress is displayed.

---

## 10. Known Divergences from Original Mini Metro

| Feature | Original | This version |
|---------|----------|-------------|
| Station shapes | 7+ shapes | 6 shapes (circle/triangle/square from start; star/hexagon/plus unlock by week — §2) |
| Map | Multiple cities | One fixed map |
| River / tunnels | Yes | No |
| Sound | Yes | No |
| Mobile support | Yes | No |
| High score | Persistent leaderboard | None |
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
| B7 (open) | Debug overlay panel and HUD bar overlap, both semi-transparent, producing garbled/unreadable text in the shared top-right area whenever debug mode is on | Canvas-drawn debug panel (`renderDebug.ts`) and the DOM `HUD` bar (`HUD.tsx`) are positioned and drawn by unrelated systems with no coordination between them | Not yet fixed — recommended fix is to start the debug panel below the HUD bar's height, or give the HUD bar a solid (non-transparent) background |
| B8 | Station overflow could never end the game — the queue could reach exactly `maxCapacity` but the check required strictly exceeding it | Every code path that pushes into a Station's queue (`trySpawnPassenger`, the transfer branch of `disembarkPassengers`, the debug add-passenger handler) gated on `< maxCapacity`, so `checkOverflow`'s `> maxCapacity` test was unreachable | Replaced with the Overflow Risk / Grace Timer state machine — a Station at/over capacity starts a Grace Timer instead of ending the game instantly; expiry while still over capacity ends it — see core/logic.md §3 Node Overflow, core/progression.md §5 |
| B9 | Selecting a Depot Train/Carriage from the HUD while debug mode is on and then clicking a Line/Train did nothing — the selection stayed visually "active" with no way to place it short of Escape or toggling debug off | `onMouseDown` checked `state.debugMode` and routed to the debug popup handler before ever reaching the `selectedReserveItem` branches, so every canvas click was swallowed by debug tooling regardless of a pending Depot selection | Reordered `onMouseDown` so the Reserve-assignment branches are checked first, before the debug-mode branch — Depot placement now works identically whether debug mode is on or off |
| B10 | `reserveCarriers`/`reserveCarriages` could in principle be driven negative by a fast repeated click while a Depot item was selected | The Reserve-assignment branches in `onMouseDown` decremented the count unconditionally on any hit, with no check that a reserve was actually available | Added a `> 0` guard before assigning and decrementing each Reserve count |
| B11 | Holding two different Lines' HUD legend swatches at once with two fingers produced the wrong outcome for both — releasing one early (should cancel) deleted it anyway, while holding the other past the threshold (should delete) got silently cancelled instead | `HUD.tsx`'s hold-to-delete tracking (`holdingLineId` + `holdTimerRef`) was a single shared value, not per-Line — a second swatch's `touchstart` overwrote the first swatch's timer reference, orphaning it | Keyed the hold state per-Line (`Set<string>` + `Map<string, number>`) so concurrent holds on different Lines can't interfere with each other's timer lifecycle — found via the `game-tester` agent's real two-finger touch dispatch, only reachable via multi-touch (impossible with a single mouse) |
