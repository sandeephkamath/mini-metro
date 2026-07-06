# Debug Mode Specification

**Version**: 1.1
**Last updated**: 2026-07-06

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

## Rules

- Debug actions are available only while the game phase is `playing`.
- Passengers added via debug bypass the "only spawn if destination shape exists" check — any shape can be assigned.
- Stations added via debug bypass the minimum-distance constraint (useful for stress testing).
- Speed multiplier is capped at 4× to avoid physics instability.
