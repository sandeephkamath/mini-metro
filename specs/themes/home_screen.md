# Home Screen Specification

**Version**: 2.2
**Last updated**: 2026-07-09
**Extends**: `metro.md` §8 Screen States

This document defines the **home screen**: a top-level phase (`home`) the player lands on before a run begins, and returns to after a run ends. Clicking Play goes directly into a run — there is no intermediate instructions overlay between `home` and `playing`.

## Flow

`home` → `playing` → `gameover` → `home` (loops)

| Transition | Trigger |
|---|---|
| `home` → `playing` | Player clicks "Play" — goes straight into a fresh run, no intermediate screen |
| `playing` → `gameover` | Station overflow (core/logic.md §3), unchanged |
| `gameover` → `home` | Player clicks the game over card's corner close icon (`metro.md` §8) |

## Content (current scope)

- Title wordmark ("MINI METRO"), a short tagline, and a "Play" control.
- Best Weeks Survived: small text near the tagline, e.g. "Best: Week 12" (`metro.md` §9.2). Omitted entirely (no line shown) if Best Weeks Survived is still 0 — nothing achieved yet, nothing to claim.
- A "View Collectibles" control opening the Collectibles Screen (below): a small, standalone icon-only button — not a picture-thumbnail preview and not a labeled button. The current Picture's own partially-revealed state (`metro.md` §9.3, §9.3.2) is not shown anywhere on the home screen itself; it's only visible once the Collectibles Screen is opened. Unlike the other additions on this list, this control is never omitted — there's always a current Picture to look at, even before the first one is ever completed.
- A "Sign In" control, next to "View Collectibles": a small, standalone icon-only button (same visual weight/style as the Collectibles icon) that triggers the interim Google Sign-In popup (`metro.md` §9.6). Web only — on Android, identity comes from the silent Play Games sign-in instead, so this control never appears there regardless of sign-in state. On web, shown only while the session has no signed-in identity yet; once signed in, it disappears (replaced functionally by "View Leaderboard" below) — there's no need to sign in twice in one session, and no "signed in as X" state is shown here.
- A "View Leaderboard" control, opening the Leaderboard (below). Present only once the current session has a signed-in identity (`metro.md` §9.6 — either the interim Sign In icon on web, or production Play Games sign-in on Android); absent before that, with no placeholder or explanation shown in its place.
- These additions sit below the tagline/Play control, not competing with them for primary visual weight — Play remains the dominant call to action.
- The Collectibles Screen depends on the Picture pool (`metro.md` §9.3.1), which is fetched once per app load alongside meta-progression — by the time the home screen would otherwise render, that fetch has already resolved one way or another (live data, a local cache, or the built-in fallback), so nothing here needs its own loading state the way the Leaderboard does.

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

## Collectibles Screen

Reached from the home screen's "View Collectibles" control. Not a new top-level phase — it is a modal overlay on top of `home` (same relationship the Weekly Upgrade popup has to `playing`), dismissible without affecting the `home`/`playing`/`gameover` flow above. Shows Pictures across three states, in a single sequence ordered by Collectible Reward index:

1. **Complete** — every Complete Picture (core/meta_progression.md §3, `metro.md` §9.3), shown as its full (fully-revealed) thumbnail, oldest first, labeled with its real-world name (e.g. "London Underground").
2. **Current** — the one in-progress Picture, shown at its live partially-revealed tile state, also labeled with its name.
3. **Up next** — the following 2–3 Pictures in the sequence (not yet current, nothing accumulated toward them yet), shown as locked placeholders: a blurred/silhouetted version of the rendered Picture or a plain "???" tile grid, with no name, percentage, or other detail — revealing which city comes next would spoil it. Nothing beyond this short lookahead is shown — the sequence is unbounded, so the screen doesn't try to enumerate it. The locked placeholders themselves are the "there's more" cue — no separate "...and more" text label is shown; the impression of an ongoing sequence comes from the tiles, not wording.

Every thumbnail in this grid (Complete or Current — not the locked placeholders, which have nothing to show) is static rather than using the animated presentation (`metro.md` §9.3.2) — with potentially many Complete Pictures on screen at once, animating the whole grid isn't worth the cost.

Tapping any Complete or Current thumbnail opens a **Picture Detail View**: a single-Picture overlay on top of the Collectibles Screen, shown large with its name and using the animated presentation (`metro.md` §9.3.2) — this is where the "living map" pays off, one Picture at a time. Locked placeholders aren't tappable. A close control on the detail view returns to the Collectibles Screen grid, not all the way back to `home`.

A close control returns to the home screen with no other side effect.

## Leaderboard

Reached from the home screen's "View Leaderboard" control — present only when the Leaderboard is available at all (`metro.md` §9.6). Not a new top-level phase — a modal overlay on top of `home`, the same relationship the Collectibles Screen above has.

- Shows a live-fetched ranked list of the Leaderboard Top N (`metro.md` §9.6 config) players by Best Weeks Survived (`core/meta_progression.md` §7), each row showing rank, Play Games display name/avatar, and Weeks Survived.
- The current player's own row is highlighted within that list if they're in it; if not, a separate row pinned below the list always shows their own rank regardless, e.g. "#4,382 — You — Week 9".
- While the list is loading, a simple loading state is shown in its place. If the fetch fails (no network, backend error), a short message plus a retry control is shown instead of a blank or broken list — nothing else on the home screen is affected either way.
- A close control returns to the home screen with no other side effect.

## Not yet decided

- Collectibles Screen layout once a player has accumulated many Complete Pictures (scroll behavior, grid density) — start with a simple wrapping grid and revisit if it looks crowded.
- Exact visual treatment of the "locked" placeholder (blurred rendered Picture vs. a generic silhouette/"???" tile grid) — needs a look at a real rendered Picture before deciding; a generic placeholder is the safe default until then.
- Leaderboard list layout at 50 rows (scroll behavior, pagination) — start with a simple scrollable list.
- Whether the game-over screen's Leaderboard rank line (`metro.md` §9.6) needs its own loading state if the submission/rank fetch hasn't resolved by the time the screen renders, or whether it simply appears a moment later once ready.
- Whether Best Weeks Survived / Picture progress should also appear anywhere during `playing` beyond the existing Week counter and day-of-week clock (`metro.md` §8) — currently they're home/game-over-only, per `metro.md` §9.
