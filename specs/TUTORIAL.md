# Tutorial Specification

**Version**: 1.0
**Last updated**: 2026-07-06
**Uses terminology from**: `themes/metro.md` (Station/Line/Train/Passenger); mechanics per `core/logic.md`

A scripted, interactive tutorial that teaches a first-time player the core loop by making them do it on the real board: draw a Line, watch a Passenger board and ride, see a delivery score, and understand what the overflow ring and Risk Timer mean before it ever kills a real run. This resolves the "scripted tutorial vs. contextual hints" open question in `memo.md` §FTUE in favor of a **scripted sandbox**: spawning is paused, the tutorial injects exactly the entities each step needs, and each step waits for the player's action before advancing.

---

## 1. Triggering

Three independent entry points:

- **Auto-run on first-ever session.** The moment a player's very first `playing` session begins (Play clicked on the `home` phase, before this browser has ever seen the Tutorial — §8 Persistence), the Tutorial starts automatically instead of dropping the player straight onto an empty board. This is the primary player-facing entry point resolving `memo.md` §FTUE's "auto-run on first-ever session" item. This entry point alone (not the other two) is additionally gated by a theme/build config flag (`Auto Tutorial Enabled`, `themes/metro.md` §5), on by default — the same "code default, not a player setting" category as the Player Speed Controls flag (core §6). Its only current use is letting automated tests opt a fresh browser profile out of the auto-run so flows exercise a clean board instead of the scripted onboarding — see `testing.md`.
- **Manual replay from the Home Screen** (`home_screen.md` § Content), for a returning player who wants to see it again: a small, always-present icon-only control starts a brand-new session exactly like Play, except the Tutorial runs regardless of `Auto Tutorial Enabled` or whether this browser has ever seen it before. Unlike the auto-run entry point, this one never marks the Tutorial "seen" if it wasn't already — it doesn't change whether the *next plain* Play click would have auto-run it.
- **Debug-triggered**, for QA/replay on any session: press **`T`** while debug mode is on and the game phase is `playing`. Unaffected by whether this browser has already seen the Tutorial — it always runs the full script from step 1 on a startable board.

All three entry points share the same preconditions and script — the only difference is what fires the trigger:

- The trigger is **ignored** unless the board is in a startable state: **no Lines drawn yet** and **no Station currently at risk**. For the auto-run and manual-replay cases this is always true (both fire on a freshly created board, before the player has drawn anything); for the debug case it means triggering it at the start of a run.
- The three fixed starting Stations (circle, triangle, square — `themes/metro.md` §2) are the tutorial's actors; they always exist, so the script is deterministic.

## 2. Relationship to Game Rules

The tutorial changes no game rules. Like debug mode, it only uses control mechanisms that already exist:

- **Clock control** — pauses and resumes game time via the same mechanism as core §6 Game Clock. The tutorial owns the clock while active.
- **Spawn control** — on entry, both Station and Passenger auto-spawn are forced off (same mechanism as `DEBUG.md` Spawn Controls). On exit, both toggles are restored to whatever state they had before the tutorial started.
- **Passenger injection** — scripted Passengers are added by the same mechanism as `DEBUG.md` Add Passenger.
- **Station injection** — the one extra Station the Extend the Line step (below) needs is added by the same mechanism as `DEBUG.md` Add Station.
- Every interaction is a real use of the actual game mechanism — nothing about boarding, delivery, drawing, or Depot placement is faked or simulated. But per §6 Exit, the entire board this builds up is discarded the moment the tutorial ends, on every exit path alike, so none of it carries into the real session that follows.

**Single stated exception**: the Rescue Window in the Overflow step (below) overrides one Station's Risk Timer so the scripted rescue can never fail. This is a tutorial-only concession and the spec calls it out where it applies.

## 3. Input While the Tutorial Is Active

- **Line drawing is fully enabled** — it is the interaction being taught. Debug mode's click-capture (click-to-add-passenger, `A` placement mode) is **suspended** so drags draw Lines instead of opening debug popups.
- All debug keys (`S`, `P`, `A`, `0`–`3`) and the `D` toggle are suspended. The HUD Pause/Play/Fast-Forward controls are suspended too — the tutorial owns the clock. The Depot tray's Train/Carriage buttons are suspended as well, **except during the Depot Train step** (§5 step 10) — that step's whole point is the player using the real Depot button and canvas click, the same mechanism as normal gameplay, not a scripted stand-in for either.
- Camera pan and zoom remain available (core §5).
- **`Escape`, or the Skip control shown on every card, exits the tutorial immediately** (see §6 Exit).

## 4. Presentation

Three visual elements, all drawn above the normal game layers (below the debug overlay in `themes/metro.md` §7 draw order):

| Element | Behavior |
|---------|----------|
| **Instruction card** | A small panel at the bottom-center of the canvas (clear of the starting-Station cluster). Shows the current step's text, a **Next** button on steps that advance by click, and a persistent **Skip** control. While a card that pauses the clock is up, the pause is total per core §6 — every timer frozen. |
| **Station highlight** | A pulsing halo around each Station the current step wants the player to look at or act on. Removed the moment the step advances. |
| **Gesture hint** | On the draw steps (First Line, Extend the Line, and the Overflow rescue), a looping animated arrow traces the expected drag path from the source Station to the target Station, repeating until the player starts a drag. This is the visual drag demonstration `memo.md` §FTUE notes is missing. |

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
| 7 | Extend the Line | Running | Inject one extra Station (a star, `themes/metro.md` §2 shapes) near the triangle Station, reachable from the existing Line's end. Highlight the triangle and new Stations; gesture hint traces triangle → new Station. Clock runs (not held) so the new Station's spawn-in animation actually plays instead of freezing on its first, barely-visible frame. | "Lines can grow, too — drag from the end of your line to connect another station." | The new Station is on a Line (extended from the existing one, or a fresh Line to it — either counts) |
| 8 | Overflow | See below | Inject Passengers at the square Station until its queue reaches capacity, putting it at risk. | See step 8 detail below. | The square Station leaves Overflow Risk (queue back below capacity) |
| 9 | Crisis Averted | Paused | — | The ring vanished: a station recovers the moment its queue drops below capacity. Keep every station connected and flowing. | Next |
| 10 | Depot Train | Paused | Grant one Reserve Train (`reserveCarriers = 1`), as if just won from a Weekly Upgrade. | "Every 5 weeks a Weekly Upgrade offers a new train or carriage. Click the train icon at the bottom, then click a line to place it." | The Reserve Train is placed on a Line (Reserve count returns to 0) |
| 11 | Wrap-Up | Paused | — | Briefly name what wasn't shown hands-on: weeks pass and more stations keep appearing; new lines unlock as the city grows. | Done → exit (§6) |

### Step 8 detail — Overflow and the Risk Timer

This is the "time running out" lesson, sequenced so the player both *sees* the countdown and *performs* the rescue:

1. **Setup (paused)**: with the clock paused, the tutorial injects Passengers at the square Station one by one up to Station capacity. The Station enters Overflow Risk and its Risk Timer starts (frozen, since the clock is paused).
2. **Demo run**: the clock runs for a short Overflow Demo interval so the player watches the red ring pulse and the countdown arc visibly shrink — then pauses again.
3. **Explain (paused)**: the card explains: a station at capacity is overflowing; the red ring is a countdown, and if it empties the game ends — this is the only way to lose. Ease the crowd before time runs out.
4. **Act (paused)**: the card instructs the player to connect the square Station — extend the existing Line from an end, or draw a new Line to it. The square Station is highlighted and the gesture hint traces a path to it from the nearest connected Station. The clock stays paused while they work; drawing works fine while paused (core §6).
5. **Rescue (running)**: the moment a commit puts the square Station on a Line, the tutorial sets that Station's Risk Timer to the **Rescue Window** (§7) — long enough that the train reaches it and boards Passengers before expiry, so the scripted rescue cannot fail — and resumes the clock. When boarding drops the queue below capacity, Overflow Risk ends (core §3 Node Overflow) and the step advances.

If a Weekly Upgrade fires during any running phase (possible if the tutorial was triggered late in a week), its Choice popup takes precedence and pauses the clock per `core/logic.md` §3; the tutorial simply waits for the player to resolve it, then continues.

## 6. Exit — Completion or Skip

On **Done** (step 11) or **Skip/Escape** (any step):

- **Skip safety runs first**: if the player skips during the Overflow or Crisis Averted steps while the square Station is still at risk, its Risk Timer is set to the Rescue Window before anything else below — skipping the tutorial must not hand the player an unavoidable game over seconds later, even for the instant it takes the reset immediately after to land.
- The entire board resets to the exact same clean baseline a normal fresh game starts from: every Station/Line/Train/Passenger/Reserve count/Score/the Game Clock itself, all discarded — as if a brand new game had just been started, on this exit path or any other (Done, Skip, Escape alike). Nothing the tutorial built up (the drawn Lines, the extra Station, any points scored, the placed Depot Train) carries into the session that follows. Only meta-progression (Best Weeks Survived, Picture Collection progress, Leaderboard identity, audio settings) is unaffected, since none of it lives in this per-session state to begin with (`core/meta_progression.md` §6).
- All tutorial visuals (cards, highlights, gesture hints) are removed as part of the same reset.
- Clock control returns to normal on the fresh board: the clock runs at 1× and the debug speed keys / HUD controls work again per `DEBUG.md` Speed Control precedence.

The board itself is stateless between runs: triggering the Tutorial again (per §1 preconditions) runs the whole script from step 1 regardless of trigger source — trivially true now that every exit already resets to the same fresh-game baseline the preconditions require. What *is* persisted is whether this browser has ever seen it at all — see §8 — which governs only the auto-run entry point; the debug `T` key ignores that flag entirely.

## 7. Configuration Values

Kept inline here (like `DEBUG.md`'s key tables) rather than in `themes/metro.md` §5, since these are script-internal timings, not general theme config.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Trigger key | `T` | Debug mode on, phase `playing`, §1 preconditions met |
| Scripted boarding Passenger | 1, at circle Station, destination triangle | Step 4 |
| Extend-the-Line Station | 1 star-shaped Station, placed reachable from the triangle Station | Step 7; bypasses the normal unlock gate and spawn-distance rules, same as `DEBUG.md` Add Station |
| Overflow injection | Fill square Station queue to capacity | Step 8; capacity per `themes/metro.md` §5 |
| Overflow Demo interval | 2 000 ms | How long the clock runs so the player sees the arc shrink (step 8.2) |
| Rescue Window | 30 000 ms | Risk Timer value granted at rescue commit (step 8.5) and on skip-safety exit (§6) |
| Scripted Reserve Train | 1 | Step 10, granted directly (not via a live Weekly Upgrade choice) |
| Card position | Bottom-center of canvas | Clear of the starting-Station cluster |
| Highlight pulse period | 1 000 ms | Wall-time driven (§4) |
| Gesture hint loop | 1 500 ms per traversal | Wall-time driven; hidden once a drag starts (§4) |

## 8. Persistence

- Backing store: the browser's `localStorage`, under a single boolean flag, separate from the meta-progression key (`core/meta_progression.md` §6) — this flag is onboarding state, not survival/collection progress.
- Set the moment the auto-run entry point (§1) fires — not on completion or skip. Once the Tutorial has been *shown*, it does not auto-show again for this browser, regardless of whether the player finished it, skipped it, or closed the tab mid-script (session state itself is never persisted, per the no-save/resume rule).
- Read once, at the moment Play is clicked on the `home` phase, to decide whether this session's `playing` transition should auto-start the Tutorial.
- If `localStorage` is unavailable or the flag is unreadable, the Tutorial falls back to auto-running every time Play is clicked from a fresh browser state — never blocks play, just repeats the onboarding rather than silently skipping it.
- Does not affect the debug `T` key, which remains available regardless of this flag's value.

## 9. Post-Tutorial Contextual Hints

Two moments the scripted Tutorial still never walks the player through live: a real Weekly Upgrade choice (step 10 grants a Reserve Train directly, without the actual choice popup), and a Line unlocking. This section adds two small, separate, one-time hints that fire the first time each of those actually happens live — independent of whether the Tutorial ever ran, was skipped, or hasn't been seen by this browser at all.

- **First Weekly Upgrade Choice hint**: the first time the free Milestone Event Choice popup (`core/logic.md` §3 Milestone Events, not the ad-gated Reserve bonus choice — §2) is ever shown to this browser, it carries one extra explanatory line beneath its normal subtitle, e.g. "This happens every few weeks — pick whichever helps more right now." Every later Milestone Choice, and every ad-gated bonus choice (same popup, reused), shows the normal subtitle only.
- **First Line unlock hint**: the first time any Line beyond the three starting ones unlocks (`core/progression.md` §4), a brief toast appears (same position/style/duration as the existing Weekly-Upgrade-bonus toast, but this is a separate message) naming what happened, e.g. "A new line just unlocked — draw it like the others." Every later unlock is silent, same as today.
- **Persistence**: each hint is its own single boolean `localStorage` flag, separate from both the Tutorial's own flag (§8) and meta-progression (`core/meta_progression.md` §6) — this is onboarding state tied to a specific UI moment, not survival/collection progress or the Tutorial itself. Set the instant the hint is shown; never reset. If `localStorage` is unavailable, the hint just shows every time that event first occurs in a session rather than blocking anything.
- Neither hint can fire while the Tutorial itself is active (§3) — not a special case, just a consequence of the Tutorial owning the clock and never driving a live Milestone Choice or Line unlock itself.
