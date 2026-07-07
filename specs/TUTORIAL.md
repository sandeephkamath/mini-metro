# Tutorial Specification

**Version**: 1.0
**Last updated**: 2026-07-06
**Uses terminology from**: `themes/metro.md` (Station/Line/Train/Passenger); mechanics per `core/logic.md`

A scripted, interactive tutorial that teaches a first-time player the core loop by making them do it on the real board: draw a Line, watch a Passenger board and ride, see a delivery score, and understand what the overflow ring and Risk Timer mean before it ever kills a real run. This resolves the "scripted tutorial vs. contextual hints" open question in `memo.md` §FTUE in favor of a **scripted sandbox**: spawning is paused, the tutorial injects exactly the entities each step needs, and each step waits for the player's action before advancing.

---

## 1. Triggering

Debug-only for now. Player-facing entry points (a home-screen Tutorial button, auto-run on first-ever session once persistence exists) are deferred — tracked in `memo.md` §FTUE.

- Press **`T`** while debug mode is on and the game phase is `playing`.
- The press is **ignored** unless the board is in a startable state: **no Lines drawn yet** and **no Station currently at risk**. In practice this means triggering it at the start of a run, before drawing anything.
- The three fixed starting Stations (circle, triangle, square — `themes/metro.md` §2) are the tutorial's actors; they always exist, so the script is deterministic.

## 2. Relationship to Game Rules

The tutorial changes no game rules. Like debug mode, it only uses control mechanisms that already exist:

- **Clock control** — pauses and resumes game time via the same mechanism as core §6 Game Clock. The tutorial owns the clock while active.
- **Spawn control** — on entry, both Station and Passenger auto-spawn are forced off (same mechanism as `DEBUG.md` Spawn Controls). On exit, both toggles are restored to whatever state they had before the tutorial started.
- **Passenger injection** — scripted Passengers are added by the same mechanism as `DEBUG.md` Add Passenger.
- Passengers delivered during the tutorial **score normally** — the board state the tutorial builds (Lines drawn, deliveries made) is real and persists after exit.

**Single stated exception**: the Rescue Window in step 7 (below) overrides one Station's Risk Timer so the scripted rescue can never fail. This is a tutorial-only concession and the spec calls it out where it applies.

## 3. Input While the Tutorial Is Active

- **Line drawing is fully enabled** — it is the interaction being taught. Debug mode's click-capture (click-to-add-passenger, `A` placement mode) is **suspended** so drags draw Lines instead of opening debug popups.
- All debug keys (`S`, `P`, `A`, `0`–`3`) and the `D` toggle are suspended. The HUD Pause/Play/Fast-Forward controls are suspended too — the tutorial owns the clock.
- Camera pan and zoom remain available (core §5).
- **`Escape`, or the Skip control shown on every card, exits the tutorial immediately** (see §6 Exit).

## 4. Presentation

Three visual elements, all drawn above the normal game layers (below the debug overlay in `themes/metro.md` §7 draw order):

| Element | Behavior |
|---------|----------|
| **Instruction card** | A small panel at the bottom-center of the canvas (clear of the starting-Station cluster). Shows the current step's text, a **Next** button on steps that advance by click, and a persistent **Skip** control. While a card that pauses the clock is up, the pause is total per core §6 — every timer frozen. |
| **Station highlight** | A pulsing halo around each Station the current step wants the player to look at or act on. Removed the moment the step advances. |
| **Gesture hint** | On the draw steps (2 and 7), a looping animated arrow traces the expected drag path from the source Station to the target Station, repeating until the player starts a drag. This is the visual drag demonstration `memo.md` §FTUE notes is missing. |

Highlight pulse and gesture-hint animation run on wall time, not game time — they must keep moving while the clock is paused (unlike the game's own animations, which freeze per `themes/metro.md` §7).

## 5. Step Sequence

Steps run strictly in order. "Clock" is the state the tutorial holds game time in for that step. Card text below is the required *content*, not exact copy.

| # | Step | Clock | Scripted setup | Card teaches | Advances when |
|---|------|-------|----------------|--------------|---------------|
| 1 | Welcome | Paused | — | The goal: passengers appear at stations and each wants to reach a station of the shape they display; you build the metro that gets them there. | Next |
| 2 | First Line | Paused | Highlight the circle and triangle starting Stations; gesture hint traces circle → triangle. | "Drag from the circle station to the triangle station to draw your first line." | A Line containing both highlighted Stations is committed |
| 3 | Your Train | Running | — | A train appeared automatically and shuttles back and forth along the line, stopping at each station. (Player watches it move.) | Next |
| 4 | A Passenger | Paused | Inject one Passenger at the circle Station with destination **triangle**. Highlight the circle Station. | The small shape is the passenger's destination: this one wants any triangle station. Passengers wait in a queue until a train that can take them arrives. | Next (clock resumes) |
| 5 | Boarding | Running → paused on event | — | The moment the scripted Passenger boards, pause and explain: passengers board a train only if it can actually take them toward their destination. | Next (clock resumes) |
| 6 | Delivery | Running → paused on event | — | The moment the scripted Passenger is delivered at the triangle Station, pause and explain: delivered, +1 point — the score in the HUD just went up. | Next |
| 7 | Overflow | See below | Inject Passengers at the square Station until its queue reaches capacity, putting it at risk. | See step 7 detail below. | The square Station leaves Overflow Risk (queue back below capacity) |
| 8 | Crisis Averted | Paused | — | The ring vanished: a station recovers the moment its queue drops below capacity. Keep every station connected and flowing. | Next |
| 9 | Wrap-Up | Paused | — | Briefly name what wasn't shown hands-on: weeks pass and more stations keep appearing; every 5 weeks a Weekly Upgrade offers a new train, carriage, or more time; new lines unlock as the city grows; the pause/fast-forward buttons are always available. | Done → exit (§6) |

### Step 7 detail — Overflow and the Risk Timer

This is the "time running out" lesson, sequenced so the player both *sees* the countdown and *performs* the rescue:

1. **Setup (paused)**: with the clock paused, the tutorial injects Passengers at the square Station one by one up to Station capacity. The Station enters Overflow Risk and its Risk Timer starts (frozen, since the clock is paused).
2. **Demo run**: the clock runs for a short Overflow Demo interval so the player watches the red ring pulse and the countdown arc visibly shrink — then pauses again.
3. **Explain (paused)**: the card explains: a station at capacity is overflowing; the red ring is a countdown, and if it empties the game ends — this is the only way to lose. Ease the crowd before time runs out.
4. **Act (paused)**: the card instructs the player to connect the square Station — extend the existing Line from an end, or draw a new Line to it. The square Station is highlighted and the gesture hint traces a path to it from the nearest connected Station. The clock stays paused while they work; drawing works fine while paused (core §6).
5. **Rescue (running)**: the moment a commit puts the square Station on a Line, the tutorial sets that Station's Risk Timer to the **Rescue Window** (§7) — long enough that the train reaches it and boards Passengers before expiry, so the scripted rescue cannot fail — and resumes the clock. When boarding drops the queue below capacity, Overflow Risk ends (core §3 Node Overflow) and the step advances.

If a Weekly Upgrade fires during any running phase (possible if the tutorial was triggered late in a week), its Choice popup takes precedence and pauses the clock per `core/logic.md` §3; the tutorial simply waits for the player to resolve it, then continues.

## 6. Exit — Completion or Skip

On **Done** (step 9) or **Skip/Escape** (any step):

- Both auto-spawn toggles are restored to their pre-tutorial states.
- All tutorial visuals (cards, highlights, gesture hints) are removed.
- Clock control returns to normal: the clock resumes at 1× and the debug speed keys / HUD controls work again per `DEBUG.md` Speed Control precedence.
- The board keeps everything real that happened: Lines drawn, Passengers injected, points scored.
- **Skip safety**: if the player skips during step 7 or 8 while the square Station is still at risk, its Risk Timer is set to the Rescue Window on the way out — skipping the tutorial must not hand the player an unavoidable game over seconds later.

The tutorial is stateless between runs: pressing `T` again on a fresh board (per §1 preconditions) runs the whole script from step 1. Nothing about tutorial completion is persisted — "has seen the tutorial" tracking belongs to the deferred player-facing entry point (`memo.md` §FTUE, Persistence).

## 7. Configuration Values

Kept inline here (like `DEBUG.md`'s key tables) rather than in `themes/metro.md` §5, since the tutorial is a debug-triggered tool for now; fold these into the theme config if a player-facing entry point ships.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Trigger key | `T` | Debug mode on, phase `playing`, §1 preconditions met |
| Scripted boarding Passenger | 1, at circle Station, destination triangle | Step 4 |
| Overflow injection | Fill square Station queue to capacity | Step 7; capacity per `themes/metro.md` §5 |
| Overflow Demo interval | 2 000 ms | How long the clock runs so the player sees the arc shrink (step 7.2) |
| Rescue Window | 30 000 ms | Risk Timer value granted at rescue commit (step 7.5) and on skip-safety exit (§6) |
| Card position | Bottom-center of canvas | Clear of the starting-Station cluster |
| Highlight pulse period | 1 000 ms | Wall-time driven (§4) |
| Gesture hint loop | 1 500 ms per traversal | Wall-time driven; hidden once a drag starts (§4) |
