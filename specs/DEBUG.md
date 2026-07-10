# Debug Mode Specification

**Version**: 1.4
**Last updated**: 2026-07-08

Debug mode is a developer tool layered on top of the running game. It does not alter game rules — it only provides visibility and controlled injection of state for testing.

---

## Activation

Press **`D`** to toggle debug mode on or off. Turning it off clears the event log.

---

## Debug Overlay (always visible in debug mode)

A semi-transparent panel on the right side of the canvas shows the sections below. The panel's top edge sits below the HUD's top bar (never overlapping it), so both stay readable while debug mode is on.

### Train Status (top section)
One row per active train:
- Movement symbol: `▶` (moving) or `◼` (stopped)
- Direction arrow: `→` or `←`
- Current station label (shape symbol)
- Passengers on board (destination shape symbols)
- Capacity used / max

### Event Log (bottom section)
The last 15 routing events (stored up to 30, displayed last 15), colour-coded. Entries are truncated to 28 characters for display.
- **Green**: passenger delivered (`✓`)
- **Orange**: passenger transferred to station queue
- **Red**: passenger skipped — wrong direction or anti-bounce rule
- **White**: passenger boarded

---

## Spawn Controls

Available in debug mode only. Toggle automatic spawning independently.

| Key | Effect |
|-----|--------|
| `S` | Toggle station auto-spawn on/off |
| `P` | Toggle passenger auto-spawn on/off |

When a spawn is paused, the timer still advances but no entity is created. Stations and passengers can still be added manually via the debug actions below. Both toggles reset to on when debug mode is turned off.

---

## Speed Control

Available in debug mode only. Keys affect the `dt` multiplier passed to the game loop.

| Key | Speed |
|-----|-------|
| `0` | Pause (dt = 0) |
| `1` | Normal (1×) |
| `2` | Fast (2×) |
| `3` | Very fast (4×) |

Speed resets to 1× when debug mode is turned off.

This is separate from the player-facing Pause/Play/Fast-Forward HUD control (`core/logic.md` §6 Game Clock), which is always available regardless of debug mode. While debug mode is on, these keyed speeds take precedence over the player's HUD speed selection; turning debug mode off hands control back to whatever the player last selected in the HUD.

---

## Add Passenger

**How**: Click any station while in debug mode (and no other action is pending).

**Result**: A shape-picker popup appears near the station showing all destination shapes that differ from the station's own shape. Clicking a shape immediately adds one passenger with that destination to the station's queue (respecting max capacity).

Clicking anywhere outside the popup cancels the action.

---

## Add Station

**How**: Press **`A`** while in debug mode. The cursor hint changes. Then click any empty area of the canvas.

**Result**: A shape-picker popup appears at the click location showing all shapes, including any not yet unlocked by the current week (debug bypasses the unlock gate — see `core/progression.md`). Clicking a shape places a new station of that shape at the click position (skipping the distance check). The station is assigned the next sequential label for its shape (e.g. T3).

Pressing `Escape` or `A` again cancels placement mode.

---

## Start Tutorial

Press **`T`** to start the scripted tutorial — see `TUTORIAL.md` for the full flow, preconditions (no Lines drawn, no Station at risk), and what it teaches. While the tutorial is active, debug click-capture and all debug keys are suspended until it exits.

---

## Debug Leaderboard Sign-In

Development/testing shortcut for the same sign-in flow the home screen's real, player-facing "Sign In" icon now also triggers (`themes/metro.md` §9.6, `home_screen.md` § Leaderboard) — this key just reaches it without needing debug mode off and a click. Entirely separate from the eventual production identity rule (Android build + Play Games sign-in, still not implemented).

**How**: Press **`L`** while in debug mode, on the `home` or `gameover` phase.

**Result**: Triggers Firebase's own "Sign in with Google" popup (a browser-compatible flow, distinct from Play Games' native Games Sign-In) — the same popup the home screen's Sign In icon opens. On success, the Leaderboard's availability condition is forced true for the rest of this session — the "View Leaderboard" control, score submission, and the game-over rank line all behave as if running on the Android build with Play Games already signed in, so the Firebase integration (Firestore schema, security rules, submission, rank queries, UI) can be exercised end-to-end from a plain web browser. Declining or closing the popup leaves the Leaderboard hidden, same as normal.

This exists purely as a faster path to the same flow while testing (see `memo.md` § Leaderboard) — the eventual production identity source is Play Games Sign-In inside the Android build, which will replace this interim web sign-in once it ships.

---

## Debug Ad Availability

Development/testing only. Lets a tester exercise the "no ads available" fail-gracefully path (`core/monetization.md` §6) without needing a real ad SDK integration to ever actually be unavailable.

**How**: Press **`V`** while in debug mode, on the `playing` phase. Toggles a forced-unavailable flag for the rest of this session.

**Result**: While forced unavailable, the On-Demand Bonus button and any pending Game-Over Continue offer (`themes/metro.md` §4.2) are hidden/skipped exactly as `core/monetization.md` §6 describes for a platform with no Ad Provider at all — Node Overflow ends the game unconditionally, same as before monetization existed. Pressing `V` again (or toggling debug mode off) restores the normal Ad Provider. On Android this flag is ANDed with whether a real rewarded ad is currently pre-loaded (`themes/metro.md` §4.2) — forcing it on always hides the offer regardless of real ad-load state, same player-visible result as on web.

---

## Rules

- Debug actions are available only while the game phase is `playing`, with one exception: Debug Leaderboard Sign-In (`L`) is available on the `home`/`gameover` phases instead, since that's where the Leaderboard itself is shown.
- Passengers added via debug bypass the "only spawn if destination shape exists" check — any shape can be assigned.
- Stations added via debug bypass the minimum-distance constraint (useful for stress testing).
- Speed multiplier is capped at 4× to avoid physics instability.
