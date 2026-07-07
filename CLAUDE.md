# Mini Metro Clone

A Mini Metro-style resource routing game. Inherits stack/workflow defaults from the parent `../CLAUDE.md` (Bun, React + TS + Vite, Tailwind, Zustand, vibe-coding rules).

## Orient Yourself Here First

Before touching game rules, read the specs in this order:

1. **`specs/core/logic.md`** — theme-neutral mechanics (Nodes, Resources, Routes, Carriers, scoring, overflow, delivery events). This is the source of truth for *how the game behaves*, independent of naming/skin. Contains no rendering/UI references.
2. **`specs/core/progression.md`** — theme-neutral pacing/difficulty knobs (Node/Resource spawn rate curves, effective waiting budget, Route/Carrier unlock schedule). The tuning layer between fixed mechanics and each theme's concrete numbers. Read this before changing difficulty or progression pacing.
3. **`specs/core/meta_progression.md`** — theme-neutral cross-session progress (Level, Best Level Reached, the unbounded Collectible Reward sequence). Distinct from `progression.md`: this governs what persists *between* sessions, not in-session difficulty. Read this before changing anything about levels, high scores, or collectible/trophy systems.
4. **`specs/themes/metro.md`** — maps core terms to metro terminology (Station/Line/Train/Passenger), plus all concrete config values (including the progression parameters from `core/progression.md` and the meta-progression parameters from `core/meta_progression.md`), rendering order, screen states, and the bug log. Read this for anything metro-specific or to find a tunable number.
5. **`specs/themes/home_screen.md`** — the top-level `home` phase shown before a run begins and returned to after game over (distinct from the in-run `start` instructions overlay covered in `metro.md` §8). Currently minimal (title + Play button only) — Best Level Reached / Picture / Collection are speced for this phase but deferred until meta-progression persistence exists.
6. **`specs/DEBUG.md`** — debug-mode overlay, spawn/speed controls, manual station/passenger injection. Only relevant when testing or adding debug tooling.
7. **`specs/TUTORIAL.md`** — the scripted first-time-user tutorial (guided first Line, scripted boarding/delivery, can't-fail overflow rescue). Debug-triggered for now (`T` in debug mode); player-facing entry points are deferred to `memo.md` §FTUE.
8. **`specs/testing.md`** — behavior spec for the automated testing agent/harness (flows covered, bug classification rules, report format). Read this before running or extending `testing/`.
9. **`memo.md`** — backlog of undecided/unimplemented future work (styling, scoring, analytics, mobile, persistence, onboarding). Check here before assuming a gap is unintentional, and add to it rather than solving ad hoc if a request expands scope.
10. **`specs/research/`** — not specs. Research notes from watching original Mini Metro playthroughs (frame-by-frame analysis, transcripts, reference screenshots) that informed some of the decisions in `themes/metro.md` and `memo.md`. Cited by path from those docs as supporting evidence; never treat a research note itself as the source of truth for behavior.

Rule of thumb: if a change affects *game rules or entity relationships*, update `core/logic.md`. If it changes *pacing or difficulty* (spawn rates, unlock schedules), update `core/progression.md`. If it changes *cross-session progress* (levels, high scores, collectibles), update `core/meta_progression.md`. If it's *metro-flavored* (colors, shapes, config numbers, terminology), update `themes/metro.md`. Don't duplicate the same rule across documents — core stays abstract, themes only add mappings/values/visuals.

## Code Map

- `src/types/game.ts` — all shared types (`GameState`, `Station`, `Train`, `MetroLine`, `Passenger`, etc.). Start here to understand shape of state.
- `src/config/gameConfig.ts` — every tunable constant (speeds, capacities, intervals, colors). Mirrors the config table in `themes/metro.md` — keep both in sync if you change a value.
- `src/logic/` — pure game logic (stations, trains, lines, passengers, delivery, overflow, the main `gameLoop.ts` tick). No DOM/canvas access allowed here (see core §6).
- `src/render/` — canvas drawing only, one file per layer (stations, lines, trains, passengers, debug overlay), composed by `renderer.ts` in the draw order specified in `themes/metro.md` §6.
- `src/hooks/` — React glue: `useGameLoop.ts` drives the RAF loop, `useGameState.ts` syncs mutable game state to React state at ~10Hz, `useMouseInput.ts` wires canvas input to `input/mouseHandler.ts`.
- `src/components/` — screens/UI (`StartScreen`, `HUD`, `GameCanvas`, `DeliveryModal`, `GameOverScreen`).

## Architecture Constraints (see core/logic.md §6 for full detail)

- Game state is one mutable object; UI reads a shallow synced copy — don't make logic depend on React re-renders.
- Entity ID counters live inside `GameState`, never at module scope (caused a prior bug — see `themes/metro.md` §10 Bug Log, B3).
- The RAF/render loop must not restart on UI re-renders (prior bug B2 — keep sync callback identity stable).
- All `src/logic/` functions must be pure.

## Testing the Game

There's an isolated Playwright harness at `testing/` (own `package.json`, never touches `src/`) plus a `game-tester` subagent (`.claude/agents/game-tester.md`) that runs it and free-explores for bugs. Spec: `specs/testing.md`.

- **Run it**: `cd testing && npm install && npx playwright install chromium` (first time), then `npm test`. Or invoke the `game-tester` subagent to run it and write a bug report to `testing/reports/`.
- **Uses npm, not Bun.** Despite the parent stack default, this repo runs on npm in practice (`package-lock.json`, no `bun.lockb`) — the harness matches that. If Bun gets adopted here, swap `npm` → `bun` in `testing/package.json` scripts and `testing/playwright.config.ts`'s `webServer.command`.
- **Game starts at week 0**, not week 1 — the first Weekly Delivery (which bumps to week 1) fires 60s later. Don't assume "week 1" as the initial-state value in new flows.
- **Draw lines before enabling debug mode, never after.** While `debugMode` is on, every canvas mousedown is routed to the debug popup handler (`src/input/mouseHandler.ts` `onMouseDown` → `onDebugMouseDown`) — a drag never starts a line, it just opens/closes the passenger/station picker. Sequence any flow that both draws lines and uses debug actions as: draw all lines first, *then* toggle debug mode on for spawn-pausing/passenger-injection. (Also don't toggle debug mode off and back on mid-flow if you're relying on the `S`/`P` spawn-pause state — turning debug off resets both to on per `DEBUG.md`.)
- **A single drag can chain multiple stations.** Per `core/logic.md` §4, any station the pointer passes within the (zoom-scaled) station hit radius of mid-drag is provisionally added to the line being drawn, and dragging an end tab inward along its own line marks terminal stations for detachment — everything commits on release. When writing test flows, keep drag paths clear of stations you don't intend to connect (straight drags between the three fixed starting stations are safe), and don't assume one drag = exactly one new segment. `testing/run-driver.mjs` has `down`/`move`/`up` primitives for multi-waypoint gestures.
- **Wait a frame after driving input before sampling canvas pixels.** The render loop draws on the next `requestAnimationFrame`, so `getCanvasPixel` right after a mouse action can read stale/blank canvas content — add a short `page.waitForTimeout(~200ms)` first (see `testing/flows/draw-line.spec.ts`).
- **The canvas background is not a uniform color.** A decorative procedural-city backdrop (roads, buildings that pop in/out, moving cars — `themes/metro.md` §7.1) draws over the `#f5f0e8` fill and *changes over time* — never assert a sampled pixel `toEqual([245,240,232])` to mean "nothing here" (a road, building, or passing car under the sample point breaks it, which is exactly how the two-finger-pan flow first failed). Use `isBackdropPixel` from `testing/helpers/gameDriver.ts` for line presence/absence, and exact pure white `[255,255,255]` for station-fill presence.
- **Fixed station positions** used by `FIXED_STATIONS` in `testing/helpers/gameDriver.ts`: circle (180, 280), triangle (400, 180), square (620, 320) — sourced from `src/logic/stations.ts`, not from any spec (the specs only say "fixed", not where).
- **Station Overflow / Game Over flow** (`testing/flows/overflow-gameover.spec.ts`) now passes reliably — the underlying bug (B8 in `themes/metro.md` §11: instant overflow gated on `< maxCapacity` so `> maxCapacity` was unreachable) was fixed via the Overflow Risk / Grace Timer state machine. If this test starts failing again, treat it as a real regression, not expected behavior.
- **A freshly created train doesn't board passengers waiting at its own spawn station until it laps back around.** `createTrain` (`src/logic/trains.ts`) sets the new train to `state: 'moving'`, already departing `stationIds[0]` — boarding only happens when a `stopped` train's `stopTimer` expires, so a passenger sitting at the line's origin station when the line is first drawn waits a full round trip (~8-11s at default speed for a 2-station line) before the train even attempts to board them. Not a spec violation (`core/logic.md` is silent on train-creation timing) but a real, player-visible delay — see `testing/reports/2026-07-04-passenger-routing.md` finding F2.
- Canvas-only state (train positions, the debug overlay's event log/train panel) isn't DOM-readable — flows attach a screenshot via `test.info().attach(...)` instead of asserting on it programmatically; the agent should actually look at the image, not assume.

## When Extending

- **Spec-first, always.** Specs are the source of truth for behavior; code implements what the spec says, not the other way around. When a change adds or alters behavior: write or update the relevant spec section (`core/logic.md`, `core/progression.md`, `core/meta_progression.md`, or `themes/metro.md`) *first*, then write code to match it. Do not implement the behavior first and edit the spec afterward as a formality — that inverts spec-first into spec-as-afterthought, and the spec stops being trustworthy as the thing code is checked against. If a change is exploratory and the shape of the behavior is genuinely unclear, sketch the spec change (even roughly) before writing implementation code, and refine both together — but the spec edit is never the last step.
- New game rule → check if it's theme-neutral (goes in core) or metro-specific (goes in theme) before writing the spec.
- Fixed a non-obvious bug → add a row to the Bug Log in `themes/metro.md` §10, same format as existing entries.
- Noticed a gap or deferred feature → add it to `memo.md` instead of leaving it undocumented.
