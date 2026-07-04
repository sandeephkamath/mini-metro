# Metro Theme Specification

**Version**: 1.2
**Last updated**: 2026-07-04
**Extends**: `../core/logic.md`

This document defines the Metro theme. It maps core abstract concepts to metro terminology, specifies metro-specific entities and visual rules, and provides all configuration values. Game mechanics not mentioned here follow core/logic.md exactly.

---

## 1. Terminology Mapping

| Core Term | Metro Term |
|-----------|-----------|
| Node | Station |
| Route | Line |
| Carrier | Train |
| Resource | Passenger |
| Delivery Event | Weekly Delivery |
| Transfer Node | Transfer Station |
| Node type | Station shape |
| Resource destination type | Passenger destination shape |

---

## 2. Station Shapes

Stations have one of three shapes. A Passenger's destination shape must differ from the shape of the Station where they are waiting.

| Shape | Symbol | Label prefix |
|-------|--------|-------------|
| Circle | ● | C (e.g. C1, C2) |
| Triangle | ▲ | T (e.g. T1, T2) |
| Square | ■ | S (e.g. S1, S2) |

Station labels (C1, T2, S3…) are assigned sequentially within each shape in order of creation and are displayed above the station on the canvas.

The first three stations are always placed at fixed positions: one circle, one triangle, one square.

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

3 Lines are unlocked at game start. The remaining 4 unlock one per Weekly Delivery.

---

## 4. Weekly Delivery

Every 60 seconds of game time a Weekly Delivery fires:

1. One new Train is added to the active Line with the fewest Trains.
2. One locked Line is unlocked (if any remain).
3. The busiest Train gains +2 Passenger capacity.

The delivery is instantaneous — the game does not pause. A brief toast notification appears in the HUD.

---

## 5. Configuration Values

| Parameter | Value | Notes |
|-----------|-------|-------|
| Canvas size | 800 × 600 px | Fixed |
| Station capacity | 6 passengers | Per station |
| Train capacity | 6 passengers | Upgradeable via delivery |
| Train speed | 90 px/s | |
| Station stop duration | 1 200 ms | |
| Station spawn interval | 15 000 ms | First spawn at 15s |
| Station min spacing | 90 px | Between any two stations |
| Station edge margin | 70 px | From canvas edges |
| Max stations | 20 | |
| Passenger spawn base | 7 000 ms | |
| Passenger spawn decay | 15% per week | Multiplied by 0.85 each week |
| Passenger spawn floor | 2 500 ms | |
| Week duration | 60 000 ms | Game time |
| Initial lines unlocked | 3 of 7 | |
| Frame dt cap | 100 ms | Prevents spiral-of-death |
| End marker tab length | 20 px | Projects past the terminal station |
| End marker hit radius | 10 px | For grabbing a specific Line's end |

---

## 6. Rendering

Drawn back to front each frame:

1. Background fill (`#f5f0e8`)
2. Line strokes (colored, thick)
3. Line end markers (colored tab + perpendicular crossbar at each Line terminus — one per Line ending at a Node, independently draggable)
4. Drag preview (dashed line to cursor, only while drawing)
5. Station shapes (white fill, neutral dark border — a Station is never colored by the Lines it belongs to)
6. Overflow warning ring (pulsing red glow on at-capacity stations)
7. Station labels (C1, T2… above each station)
8. Passenger icons waiting at stations (small black destination shapes)
9. Train rectangles (dark fill, colored border, rotated to direction of travel)
10. Passenger icons inside trains (tiny black destination shapes)
11. Debug overlay (when debug mode is active)

---

## 7. Screen States

| Phase | What the player sees |
|-------|---------------------|
| start | Welcome screen with instructions and Start button |
| playing | Full canvas + HUD bar (score, week number) |
| gameover | Canvas dimmed, game over overlay with final score and restart button |

---

## 8. Known Divergences from Original Mini Metro

| Feature | Original | This version |
|---------|----------|-------------|
| Delivery choice | Player picks 1 of 3 options | Auto-assigned |
| Station shapes | 7+ shapes | 3 shapes |
| Map | Multiple cities | One fixed map |
| River / tunnels | Yes | No |
| Sound | Yes | No |
| Line deletion | Yes | No |
| Mobile support | Yes | No |
| High score | Persistent leaderboard | None |

---

## 9. Bug Log

| ID | Symptom | Root Cause | Rule Fix |
|----|---------|-----------|----------|
| B1 | Only one train visible after delivery | New trains always spawn at same position (progress 0, start of line) | Train staggering rule — see core §3 Carrier |
| B2 | Position jitter mid-game | Sync callback recreated each React render, restarting the RAF loop | Stable callback identity — see core §6 Architecture |
| B3 | Station positions distorted on spawn | Module-level ID counters reset on React re-render, causing ID collisions | ID counters in game state — see core §6 Architecture |
| B4 | Passengers re-board the train that just transferred them | Disembark and board both ran on arrival in the same tick | Board on departure, disembark on arrival — see core §3 Disembarkation |
| B5 | Passengers bounce between two transfer stations | Boarding BFS was unbounded; both endpoints matched via multi-hop | One-hop transfer limit + anti-bounce check — see core §3 Routing |
| B6 | Extending a Route from a Station with multiple Route ends always extended the wrong one (and Stations visually looked "owned" by one color) | `getLineForStation` picked the first Line in iteration order that touched the Station, ignoring which end the player actually dragged from; Station border was tinted by that same first Line | Per-Line end markers with independent hit-testing (`getLineEndpointAt`) — see core §4 Route Drawing Interaction; Station border is now a neutral color |
| B7 (open) | Debug overlay panel and HUD bar overlap, both semi-transparent, producing garbled/unreadable text in the shared top-right area whenever debug mode is on | Canvas-drawn debug panel (`renderDebug.ts`) and the DOM `HUD` bar (`HUD.tsx`) are positioned and drawn by unrelated systems with no coordination between them | Not yet fixed — recommended fix is to start the debug panel below the HUD bar's height, or give the HUD bar a solid (non-transparent) background |
