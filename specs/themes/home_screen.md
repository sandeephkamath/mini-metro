# Home Screen Specification

**Version**: 1.1
**Extends**: `metro.md` §8 Screen States

This document defines the **home screen**: a top-level phase (`home`) the player lands on before a run begins, and returns to after a run ends. It is distinct from the `start` phase's instructions overlay (title, how-to-play bullets, Start Game button, shown over the fixed starting stations) — the home screen precedes that overlay rather than replacing it.

## Flow

`home` → `start` → `playing` → `gameover` → `home` (loops)

| Transition | Trigger |
|---|---|
| `home` → `start` | Player clicks "Play" |
| `start` → `playing` | Player clicks "Start Game" (existing behavior, unchanged) |
| `playing` → `gameover` | Station overflow (core/logic.md §3), unchanged |
| `gameover` → `home` | Player clicks "Back to Home" |

## Content (current scope)

- Title wordmark ("MINI METRO"), a short tagline, and a "Play" control. No other interactive elements.
- Best Level Reached, the current Picture (partially revealed), and a "View Collection" control (per `metro.md` §9) are **not** shown yet — no persistence exists for meta-progression. Deferred; see `memo.md`.

## Visual Design

Styled after the original Mini Metro title screen: a full-bleed map-colored background with a self-running **ambient metro scene**, and minimal centered typography over it.

### Ambient metro scene (decorative background)

- The home screen fills its area with the map background color (same cream as the in-game map) and draws an animated, purely decorative metro scene behind the title. It is **not** the real game state — it has no gameplay meaning, is not interactive, and is discarded on leaving the `home` phase.
- The scene contains several metro lines using the theme's Line color palette, drawn with the same visual language as in-game lines: uniform thickness, rounded caps/joins, and octilinear geometry (segments only horizontal, vertical, or 45°). Lines enter and exit past the screen edges so the map reads as a slice of a larger city.
- A pale water band crosses the map behind the lines, echoing the rivers of the original's city maps.
- On entering the `home` phase, each line **draws itself in** from one end, staggered one after another. Stations pop in as the drawing edge passes them.
- Stations sit at bend points and mid-segment stops: white fill with a dark outline, using the theme's station shape set. Each station idles with a gentle slow pulse.
- Each line runs one or two trains that travel continuously along it, ping-ponging between the line's ends and dwelling briefly at each station. Trains only start after their line has finished drawing in.
- Waiting passengers accumulate slowly at stations as small dark shape dots beside the station; when a train dwells at a station its waiting passengers are cleared (boarding, cosmetically).
- A soft radial wash of the background color sits over the scene's center so the title and Play control stay legible; the scene reads clearly toward the screen edges.

### Title & Play control

- Wordmark: "MINI" in a light weight and "METRO" in a heavy weight, wide letter-spacing, dark ink color — one line, centered above screen center. It fades/slides in on entry.
- Beneath the wordmark, a small divider row of three station shapes (circle, triangle, square) in their theme colors, popping in one after another.
- Tagline below the divider: one short sentence, muted color.
- Play control: a large round button in the primary line color (red) containing a white play triangle, with a soft repeating pulse ring, centered below the tagline. A small "PLAY" label sits under it. Hover/press feedback: slight grow on hover, slight shrink on press.
- Clicking/tapping anywhere else does nothing.

### Ambient scene tuning values

| Value | Meaning |
|---|---|
| 4 lines | Ambient lines in the scene (first four theme Line colors) |
| ~1s per line, ~0.3s stagger | Draw-in duration and per-line delay on entry |
| ~55 px/s | Ambient train travel speed (slower than in-game, calmer) |
| ~0.7s | Train dwell time at each ambient station |
| 3 max | Waiting passenger dots per ambient station |
| ~2.5–5s | Random interval between ambient passenger arrivals at a station |

## Not yet decided

- Where Best Level Reached / Picture / Collection entry land once meta-progression persistence exists (this doc, once written, will absorb the bullets currently sitting under `metro.md` §9 for the `start` row).
