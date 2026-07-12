# Tutorial Specification

**Version**: 1.14
**Last updated**: 2026-07-12
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

- **Clock control** — pauses and resumes game time via the same mechanism as core §6 Game Clock. The tutorial owns the clock while active. Beyond the per-step pause/run split (§5), Week and Milestone Event progression are suppressed for the Tutorial's entire duration, regardless of which step is running — the scripted board's week number is never meant to mean anything, and a real Weekly Upgrade Choice popup firing mid-script would derail the guided flow it's supposed to be teaching. A player idling on a running step (e.g. "Your Train & Delivery") no longer silently racks up real weeks in the background.
- **Spawn control** — on entry, both Station and Passenger auto-spawn are forced off (same mechanism as `DEBUG.md` Spawn Controls). On exit, both toggles are restored to whatever state they had before the tutorial started.
- **Passenger injection** — scripted Passengers are added by the same mechanism as `DEBUG.md` Add Passenger.
- **Station injection** — the extra Stations the Extend the Line and A New Line steps (below) need are added by the same mechanism as `DEBUG.md` Add Station.
- Every interaction is a real use of the actual game mechanism — nothing about boarding, delivery, drawing, or Depot placement is faked or simulated. But per §6 Exit, the entire board this builds up is discarded the moment the tutorial ends, on every exit path alike, so none of it carries into the real session that follows.

**Single stated exception**: the Rescue Window in the Overflow step (below) overrides one Station's Risk Timer so the scripted rescue can never fail. This is a tutorial-only concession and the spec calls it out where it applies.

## 3. Input While the Tutorial Is Active

- **Line drawing is fully enabled** — it is the interaction being taught. Debug mode's click-capture (click-to-add-passenger, `A` placement mode) is **suspended** so drags draw Lines instead of opening debug popups.
- **On a step that instructs a specific drag** (First Line, Extend the Line, A New Line), only the two named Stations for that step can start or extend anything — a mousedown or mid-drag pass over any other Station is ignored outright (no fresh Line starts, nothing chains in), and neither does a fallback to camera panning. An earlier version let the player draw an uninstructed Line between any two Stations at any time (e.g. square → triangle while the card was asking for circle → triangle); the stray Line didn't satisfy the step, didn't get explained, and just sat on the board confusing the player about why nothing advanced. Steps with no single instructed pair (Ride & Delivery, Depot Train/Carriage, the Overflow rescue's flexible "extend or draw new" choice) are unrestricted, per their own rules.
- All debug keys (`S`, `P`, `A`, `0`–`3`) and the `D` toggle are suspended. The HUD Pause/Play/Fast-Forward controls are suspended too — the tutorial owns the clock. The Depot tray's Train/Carriage buttons are suspended as well, **except during the Depot Train and Depot Carriage steps** (§5 steps 5–6) — those steps' whole point is the player using the real Depot buttons and canvas clicks, the same mechanism as normal gameplay, not a scripted stand-in for either.
- Camera pan and zoom remain available (core §5).
- **`Escape`, or the Skip control shown on every card, exits the tutorial immediately** (see §6 Exit).

## 4. Presentation

Three visual elements, all drawn above the normal game layers (below the debug overlay in `themes/metro.md` §7 draw order):

| Element | Behavior |
|---------|----------|
| **Instruction card** | A small panel at the bottom-center of the canvas (clear of the starting-Station cluster). Shows the current step's text, a **Next** button on steps that advance by click, and a persistent **Skip** control. While a card that pauses the clock is up, the pause is total per core §6 — every timer frozen. |
| **Station highlight** | A pulsing halo around each Station the current step wants the player to look at or act on. Removed the moment the step advances. |
| **Gesture hint** | On the draw steps (First Line, Extend the Line, A New Line, and the Overflow rescue), a looping animated arrow traces the expected drag path from the source Station to the target Station, repeating until the player starts a drag. This is the visual drag demonstration `memo.md` §FTUE notes is missing. |
| **Depot control highlight** | Same pulsing halo as the Station highlight, but drawn around the HUD's Depot Train or Depot Carriage icon instead of a canvas Station — the Depot Train and Depot Carriage steps are the only two whose target is a button, not a Station, so without this the player has no on-screen indication of where "the train icon at the bottom" actually is. Removed the moment the step advances (Reserve count returns to 0). |

Highlight pulse and gesture-hint animation run on wall time, not game time — they must keep moving while the clock is paused (unlike the game's own animations, which freeze per `themes/metro.md` §7).

The HUD's Week label and clock badge (`themes/metro.md` §8 playing row) are hidden for the Tutorial's entire duration — they never advance meaningfully (per §2 above) and sat directly behind/beside the instruction card and Station highlights, competing for the same visual space. The score badge is unaffected and stays visible, since the Delivery step's own lesson depends on watching it tick up.

## 5. Step Sequence

Steps run strictly in order. "Clock" is the state the tutorial holds game time in for that step. Card text below is the required *content*, not exact copy.

The Passenger is introduced up front, in the same card that asks for the first drag (not a separate Welcome step before it, and not a separate step after the Line exists) — the player sees what they're building toward and is asked to draw in one beat, no extra "Next" click in between. Overflow and Crisis Averted are sequenced last, after both Depot steps — the "how do I lose" lesson lands right before the closing Wrap-Up, once the player has already seen the full toolkit (a second train, a carriage) they could use to prevent it.

| # | Step | Clock | Scripted setup | Card teaches | Advances when |
|---|------|-------|----------------|--------------|---------------|
| 1 | First Line & Passenger | Paused | Inject one Passenger at the circle Station with destination **triangle**, already visible (fully faded in, not mid-animation — see note below) when this card appears. Highlight the circle and triangle starting Stations; gesture hint traces circle → triangle. | One card, both ideas: a passenger wants to reach a triangle station; drag from the circle station to the triangle station to carry it there. | A Line containing both highlighted Stations is committed |
| 2 | Your Train & Delivery | Running (never held) | Reposition the auto-created Train to already be halfway back toward the circle Station, heading there (see note below) — instead of the half-lap it would otherwise need before ever reaching the waiting Passenger. | One card, said upfront before any of it happens: "A train appeared automatically — watch it pick up your passenger and deliver them for a point." No pause for the train appearing, boarding, or delivery — the clock just keeps running through all of it. | The scripted Passenger is delivered at the triangle Station (fully automatic — no card, no click) |
| 3 | Extend the Line | See below | Inject one extra Station (a star, `themes/metro.md` §2 shapes) near the triangle Station. Highlight the triangle and new Stations; gesture hint traces the Line's end-tab handle at the triangle Station → the new Station (visual guidance only — see step 3 detail). | See step 3 detail below. | The new Station is on the same Line as circle→triangle |
| 4 | A New Line | See below | No injection — reuses the existing square Station. Highlight the square and triangle Stations; gesture hint traces square → triangle. | See step 4 detail below. | A Line contains both the square and triangle Stations |
| 5 | Depot Train | Paused | Grant one Reserve Train (`reserveCarriers = 1`), as if just won from a Weekly Upgrade. | "Every 5 weeks a Weekly Upgrade offers a new train or carriage. Here's a new train: click the train icon at the bottom, then click a line to place it." | The Reserve Train is placed on a Line (Reserve count returns to 0) |
| 6 | Depot Carriage | Paused | Grant one Reserve Carriage (`reserveCarriages = 1`), as if just won from a Weekly Upgrade. | "Carriages add capacity to a train already running. Click the carriage icon, then click a train on the map to attach it." | The Reserve Carriage is placed on a Train (Reserve count returns to 0) |
| 7 | Overflow | See below | Inject one extra Station (a hexagon, `themes/metro.md` §2 shapes) reachable from the square Station, then inject Passengers at it until its queue reaches capacity, putting it at risk. | See step 7 detail below. | The hexagon Station leaves Overflow Risk (queue back below capacity) |
| 8 | Crisis Averted | Paused | — | The ring vanished: a station recovers the moment its queue drops below capacity. Keep every station connected and flowing. | Next |
| 9 | Wrap-Up | Paused | — | Briefly name what wasn't shown hands-on: weeks pass and more stations keep appearing; new lines unlock as the city grows. | Done → exit (§6) |

Note on step 1's Passenger: a Passenger's queue-in fade/scale-in is keyed to game time (same mechanism as the Station spawn animation). Since step 1 holds the clock, an injection timed like a normal spawn would freeze on its first frame — barely visible, alpha and size both near zero. The injection instead backdates the Passenger's queued-at time so it renders fully settled the instant the card appears, the same fix already applied to step 3's Station spawn (by running the clock instead, since a Station's animation has no equivalent "settled" shortcut). The same backdating applies to the circle and triangle starting Stations the instant the Tutorial begins, for the same reason (`themes/metro.md` §11 Bug Log B32) — but deliberately **not** to the square Station: square isn't looked at until step 4 (or step 7's rescue target, if step 4 skipped it — it never does), so forcing it fully-formed at time zero alongside circle/triangle made it "appear" before the two Stations the script actually opens with, out of sequence with how the tutorial actually introduces its actors. Left un-backdated, square starts its own 600ms fade-in at the same moment circle/triangle are forced complete, and — because step 2 (Your Train & Delivery) runs the clock — finishes settling within that step, well before it's ever highlighted.

Note on step 2: originally three separate paused beats, each with its own card and Next click — "A train appeared…", then an "On board!" card, then a "Delivered! +1 point" card. All three are folded into a single upfront line shown the moment step 2 begins, and the clock never pauses for any of it: it runs continuously from the moment the Line is committed straight through the Train appearing, boarding, the ride, and delivery, advancing automatically into "Extend the Line" the instant the Passenger is delivered. Boarding and scoring still happen exactly as before (per core §3 and the scoring rule in `core/logic.md`) — none of it is narrated as its own stop-and-explain beat, since the score ticking up in the HUD is visible on its own. This whole train→board→ride→deliver leg takes zero player input.

Also on step 2's Train: per core §3, a newly-created Train departs the Line's first Station without boarding anyone already waiting there — normally unnoticeable, but the scripted Passenger from step 1 sits at exactly that Station, so left alone the player would watch a full circle→triangle→circle lap before boarding ever happens. Entering step 2 immediately repositions that one Train to already be at the segment's midpoint, heading back toward the circle Station, so it only needs a half-segment trip to reach it and board — shortening, not skipping, the wait. Scoped to this scripted Train only; normal Train creation elsewhere (a real first Line, a Depot Train) is unaffected.

### Step 3 detail — Extend the Line

Core §4 lets a Station belong to more than one Line, and a Line grows by grabbing the small end-tab handle at its terminus (the same handle `getLineEndpointAt`/`getLineEndpoints`, `src/logic/lines.ts`, already renders for real gameplay) rather than the Station body itself — grabbing the body instead normally starts a brand new Line. Two earlier versions of this step tried to teach that distinction honestly: one just asked the player to drag "from the triangle Station" and assumed that read as an extension (it often didn't — any click near the Station's edge could land inside or outside the handle's tiny hit radius by chance); the next verified the actual outcome and, on a miss, discarded the accidental Line and made the player retry the identical drag up to a limit. Both left the outcome hostage to landing a few pixels precisely, and the retry flow in particular just made a frustrated player repeat the same miss with an apologetic card in between. This version drops the precision requirement entirely: **a drag connecting the triangle and star Stations always extends the existing circle→triangle Line, regardless of whether the player's grab actually landed on the end-tab handle or the Station body.**

1. **Setup (running)**: inject the star Station near the triangle Station; highlight both; gesture hint traces from the triangle Station's actual Line-end handle position (not the Station center) to the new Station — still visually pointing at the small marker, as a demonstration of the real mechanism the player will use for every future Line, but no longer something the drag must land on to succeed.
2. **Act (running), input restricted to this pair (§3)**: the card asks the player to drag from the end of their Line to the new star Station. Any mousedown or mid-drag pass touching the triangle or star Station is captured directly into an extension of the existing Line — appended to whichever end triangle currently sits at — regardless of which of the two the player actually started from or how close to the handle they landed. A mousedown anywhere else during this step does nothing (§3). The clock keeps running while they work.
3. **Explain (paused, on connect)**: the moment the star Station joins the Line, pause and explain — lines can grow; that's still one Line, one Train, just longer now. Next continues into step 4, "A New Line", to separately teach starting a fresh Line (untaught until now).

Because the drag is captured rather than merely hinted at, this step's outcome is now mechanically guaranteed the same way step 4's always was — the Tutorial no longer needs to verify or explain a different outcome branch.

### Step 4 detail — A New Line

1. **Setup (running)**: no injection — reuses the existing square Station, which has no Line touching it yet (nothing before this step ever connects it). Highlight the square and triangle Stations; gesture hint traces square → triangle. Triangle is a mid-Line Station at this point (it sits between circle and star on the first Line), so it has no end-tab handle of its own to grab by accident — Station centers are fine here. While this step and its Explain phase are active, the HUD's Line-unlock swatch row (`themes/metro.md` §5) also pulses the specific slot this new Line will claim — the same slot `getAvailableLine` (`src/logic/lines.ts`) would hand out for any real new-Line draw — tying the map lesson to that HUD element.
2. **Act (running), input restricted to this pair (§3)**: the card asks the player to drag from the square Station to the triangle Station to start a second, independent Line. A mousedown on any other Station during this step does nothing (§3).
3. **Explain (paused)**: the moment a Line contains both the square and triangle Stations, pause and explain: that's a new Line — it runs its own Train, independent of every other Line, and it just claimed one of the Line-unlock slots in the HUD (core/progression.md §4 — a limited, gradually-unlocking set, not unlimited). Next resumes and continues to Depot Train.

This pairing can never accidentally extend anything — square has no prior Line to extend, so the new-Line outcome is mechanically guaranteed, not just instructed. Because square is now spoken for by this step, the Overflow step (below) injects its own Station instead of reusing square as earlier versions did.

### Step 7 detail — Overflow and the Risk Timer

This is the "time running out" lesson, sequenced so the player both *sees* the countdown and *performs* the rescue:

1. **Setup (paused)**: with the clock paused, the tutorial injects a new Station (a hexagon, reachable from the square Station — the nearest already-connected Station by this point) and then Passengers at it one by one up to Station capacity. The Station enters Overflow Risk and its Risk Timer starts (frozen, since the clock is paused). A fresh injected Station is used here, rather than the square Station itself as earlier versions did, because square is now already connected — spoken for by step 4's "A New Line" lesson — so it can no longer stand in for "a Station nobody's connected yet."
2. **Demo run**: the clock runs for a short Overflow Demo interval so the player watches the red ring pulse and the countdown arc visibly shrink — then pauses again.
3. **Explain (paused)**: the card explains: a station at capacity is overflowing; the red ring is a countdown, and if it empties the game ends — this is the only way to lose. Ease the crowd before time runs out.
4. **Act (paused)**: the card instructs the player to connect the hexagon Station — extend the existing Line from an end, or draw a new Line to it. The hexagon Station is highlighted and the gesture hint traces a path to it from the nearest connected Station. The clock stays paused while they work; drawing works fine while paused (core §6). Unlike the three earlier draw steps, this Act is not restricted to one exact pair (§3) — the whole point is letting the player choose which of the strategies just taught (extend or new Line) to apply.
5. **Rescue (running)**: the moment a commit puts the hexagon Station on a Line, the tutorial sets that Station's Risk Timer to the **Rescue Window** (§7) — long enough that the train reaches it and boards Passengers before expiry, so the scripted rescue cannot fail — and resumes the clock. When boarding drops the queue below capacity, Overflow Risk ends (core §3 Node Overflow) and the step advances.

A Weekly Upgrade Choice popup can never interrupt any of this — Milestone Event progression is suppressed for the Tutorial's whole duration (§2), so no running phase, however long a player lingers on it, can ever trigger one.

## 6. Exit — Completion or Skip

On **Done** (step 9) or **Skip/Escape** (any step):

- **Skip safety runs first**: if the player skips during the Overflow or Crisis Averted steps while the injected hexagon Station is still at risk, its Risk Timer is set to the Rescue Window before anything else below — skipping the tutorial must not hand the player an unavoidable game over seconds later, even for the instant it takes the reset immediately after to land.
- The entire board resets to the exact same clean baseline a normal fresh game starts from: every Station/Line/Train/Passenger/Reserve count/Score/the Game Clock itself, all discarded — as if a brand new game had just been started, on this exit path or any other (Done, Skip, Escape alike). Nothing the tutorial built up (the drawn Lines, the extra Station, any points scored, the placed Depot Train and Carriage) carries into the session that follows. Only meta-progression (Best Weeks Survived, Picture Collection progress, Leaderboard identity, audio settings) is unaffected, since none of it lives in this per-session state to begin with (`core/meta_progression.md` §6).
- All tutorial visuals (cards, highlights, gesture hints) are removed as part of the same reset.
- Clock control returns to normal on the fresh board: the clock runs at 1× and the debug speed keys / HUD controls work again per `DEBUG.md` Speed Control precedence.

The board itself is stateless between runs: triggering the Tutorial again (per §1 preconditions) runs the whole script from step 1 regardless of trigger source — trivially true now that every exit already resets to the same fresh-game baseline the preconditions require. What *is* persisted is whether this browser has ever seen it at all — see §8 — which governs only the auto-run entry point; the debug `T` key ignores that flag entirely.

## 7. Configuration Values

Kept inline here (like `DEBUG.md`'s key tables) rather than in `themes/metro.md` §5, since these are script-internal timings, not general theme config.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Trigger key | `T` | Debug mode on, phase `playing`, §1 preconditions met |
| Scripted boarding Passenger | 1, at circle Station, destination triangle | Step 1, injected in the same card that asks for the first drag |
| Extend-the-Line Station | 1 star-shaped Station, placed reachable from the triangle Station | Step 3; bypasses the normal unlock gate and spawn-distance rules, same as `DEBUG.md` Add Station; drag capture makes the extension outcome guaranteed (step 3 detail), not just instructed |
| New-Line Station pair | Existing square + triangle Stations | Step 4; no injection — square has no Line touching it yet at this point in the script |
| Scripted Reserve Train | 1 | Step 5, granted directly (not via a live Weekly Upgrade choice) |
| Scripted Reserve Carriage | 1 | Step 6, granted directly (not via a live Weekly Upgrade choice) |
| Overflow Station | 1 hexagon-shaped Station, placed reachable from the square Station | Step 7; same bypass as the Extend-the-Line Station; used instead of square since square is connected by step 4 |
| Overflow injection | Fill the Overflow Station's queue to capacity | Step 7; capacity per `themes/metro.md` §5 |
| Overflow Demo interval | 2 000 ms | How long the clock runs so the player sees the arc shrink (step 7.2) |
| Rescue Window | 30 000 ms | Risk Timer value granted at rescue commit (step 7.5) and on skip-safety exit (§6) |
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

Two moments the scripted Tutorial still never walks the player through live: a real Weekly Upgrade choice (steps 5–6 grant a Reserve Train and a Reserve Carriage directly, without the actual choice popup), and a Line unlocking. This section adds two small, separate, one-time hints that fire the first time each of those actually happens live — independent of whether the Tutorial ever ran, was skipped, or hasn't been seen by this browser at all.

- **First Weekly Upgrade Choice hint**: the first time the free Milestone Event Choice popup (`core/logic.md` §3 Milestone Events, not the ad-gated Reserve bonus choice — §2) is ever shown to this browser, it carries one extra explanatory line beneath its normal subtitle, e.g. "This happens every few weeks — pick whichever helps more right now." Every later Milestone Choice, and every ad-gated bonus choice (same popup, reused), shows the normal subtitle only.
- **First Line unlock hint**: the first time any Line beyond the three starting ones unlocks (`core/progression.md` §4), a brief toast appears (same position/style/duration as the existing Weekly-Upgrade-bonus toast, but this is a separate message) naming what happened, e.g. "A new line just unlocked — draw it like the others." Every later unlock is silent, same as today.
- **Persistence**: each hint is its own single boolean `localStorage` flag, separate from both the Tutorial's own flag (§8) and meta-progression (`core/meta_progression.md` §6) — this is onboarding state tied to a specific UI moment, not survival/collection progress or the Tutorial itself. Set the instant the hint is shown; never reset. If `localStorage` is unavailable, the hint just shows every time that event first occurs in a session rather than blocking anything.
- Neither hint can fire while the Tutorial itself is active (§3) — not a special case, just a consequence of the Tutorial owning the clock and never driving a live Milestone Choice or Line unlock itself.
