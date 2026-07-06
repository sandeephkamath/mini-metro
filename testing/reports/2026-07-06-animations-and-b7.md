# Test Report — 2026-07-06 — B7 fix + new animations (train/passenger fx, light in-train icons)

**Scope of this run**: full Playwright suite (desktop + mobile projects), plus a focused
exploratory pass on the uncommitted working-tree changes: the B7 debug-overlay/HUD
overlap fix, the new train spawn-in / passenger queue-in / board-deliver ghost-flourish
animations, and the light-on-dark in-train passenger icons.

## Suite Results

`npm test` (21 tests: 12 desktop + 9 mobile, per `testing/playwright.config.ts`) — **21/21 passed**, no retries needed. Re-ran the full suite again after exploration to confirm no regressions were introduced by the exploratory steps — still 21/21.

| Project | Flow file | Result |
|---|---|---|
| desktop | boot-and-start.spec.ts (×3) | ✓ |
| desktop | debug-mode.spec.ts | ✓ |
| desktop | draw-line.spec.ts | ✓ |
| desktop | overflow-gameover.spec.ts | ✓ |
| desktop | restart.spec.ts | ✓ |
| desktop | passenger-direct-delivery.spec.ts | ✓ |
| desktop | passenger-transfer-routing.spec.ts (×2) | ✓ |
| desktop | weekly-upgrade.spec.ts | ✓ |
| mobile | touch-basics.spec.ts (×4) | ✓ |
| mobile | touch-delete-line.spec.ts (×3) | ✓ |
| mobile | touch-pinch-zoom.spec.ts (×2) | ✓ |

## Targeted Exploration (per instructions)

All of the following were driven via throwaway Playwright scripts under `testing/flows/` (deleted after use, per the isolation rules) using `testing/helpers/gameDriver.ts` / `touchDriver.ts` — never touched `src/`.

1. **B7 (debug overlay vs. HUD overlap)** — drew 2 lines, toggled debug mode on, screenshotted. Panel top edge sits cleanly at y=48, fully below the HUD's top bar; both the HUD text ("Week 0 · Level 0", speed controls, clock badge, score) and the debug panel (train status rows, event log) are fully readable with zero pixel overlap. Confirmed on both the native desktop canvas and the rotated mobile viewport (panel renders in the equivalent rotated corner, still clear of the rotated HUD bar). **Fix verified working, no regression.**

2. **Animation freeze — player Pause button**: drew a line (train mid spawn-fade), clicked the HUD Pause button, took two canvas-only screenshots 800ms apart — byte-identical. Frozen correctly.

3. **Animation freeze — debug speed 0**: same check with debug mode + `0` key instead of player Pause — byte-identical across 8 repeated runs (canvas-only screenshots). (Note: an equivalent check using full-*page* screenshots was flaky — DOM/HUD text anti-aliasing differs very slightly between two identical-state renders; this is a screenshot-methodology artifact, not a game bug. Canvas-only comparison, which is unaffected by DOM subpixel rendering, was reliable and always froze correctly.)

4. **Animation freeze — Milestone Choice pause**: fast-forwarded to week 5 (debug speed 4×) to trigger the Weekly Upgrade choice popup, confirmed the popup was visible, then took two canvas-only screenshots 1000ms apart while it was showing — byte-identical (frozen). Then picked "New Train" and confirmed the canvas *does* change again afterward (resumed correctly, toast appears, Depot count increments to ×1).

5. **4× debug speed**: drew 2 lines, paused auto-spawns, set speed to 4×, debug-injected a passenger — no rendering corruption, no torn/duplicated animation frames, train/passenger icons render at consistent positions.

6. **Boarding/delivery regression check + fx visual confirmation**: debug-injected a passenger with a direct destination, screenshotted every ~500ms across a full board→ride→deliver cycle (~13s). Confirmed via the debug event log overlay: `boarded ▲` then `delivered ▲ ✓`, score incremented 0→1, matching `core/logic.md` §3 exactly — **no behavior regression from the fx additions**. Zoomed crops of the delivery moment show the growing/fading gray ghost icon drifting upward from the station, exactly matching the themes/metro.md §7 item 8 description; it fully fades out within ~2 frames (≈160ms of the 400ms window, sampled at 80ms intervals — consistent, not stuck). Zoomed crops of an in-transit train clearly show the light (`#f5f0e8`) passenger icon against the dark train body — legible, no rendering artifacts.

7. **Queue-in animation**: debug-injected a passenger, sampled canvas at 30ms/180ms/480ms after injection — icon visibly grows from small/faint to full-size/full-opacity, consistent with the 300ms config value.

8. **Game Over screen fx cleanliness**: drove a station to overflow via 6 rapid debug-injected passengers, advanced past the Risk Timer at 4× to end the game. Game Over overlay is cleanly dimmed, all 6 passenger dots render at full size/opacity (no stuck partial-fade from the rapid injection), debug panel is present but clock/animations correctly frozen (two screenshots 1s apart, byte-identical). No leftover fx/animation artifacts.

9. **Rapid restart spam mid-animation** (6× reload-and-restart cycles, each mid a queue-in/train-spawn animation): zero console/page errors.

10. **Toggle debug mode mid-drag**: started a mouse-down drag from a station, pressed `D` mid-drag, continued and released — zero console/page errors, no crash to game-over, consistent with existing `mouseHandler.ts` debug-routing behavior.

None of items 1–10 produced a mismatch against `specs/themes/metro.md` §5/§7 or `core/logic.md`.

## Findings

| ID | Flow | Classification | Symptom | Expected | Repro Steps | Severity |
|----|------|----------------|---------|----------|--------------|----------|
| F1 | free-form (Speed Controls / player Pause interaction) | Bug | Once the player has paused via the HUD Pause button, turning on debug mode and pressing a speed key (`1`/`2`/`3`) does **not** resume the game clock — the canvas stays frozen indefinitely until the player clicks Play/Fast-Forward again (or debug mode is toggled off and the HUD Play button is clicked). Confirmed reproducible (not flaky) in both orderings: Pause→debug-on→speed key, and debug-on→speed key→Pause (the latter is *expected* to freeze per spec; the former is not). | `specs/DEBUG.md` Speed Control section: "This is separate from the player-facing Pause/Play/Fast-Forward HUD control... While debug mode is on, these keyed speeds take precedence over the player's HUD speed selection." Pause is one of the three mutually-exclusive player-selectable clock states named in the same sentence (`core/logic.md` §6), so pressing a debug speed key while debug mode is on should un-pause the clock, the same way it overrides a 1×/2× selection. | 1) Start a game, draw any line. 2) Click the HUD Pause (`II`) button. 3) Press `D` to enable debug mode. 4) Press `1` (Normal speed). 5) Observe the canvas via two screenshots ~1s apart — byte-identical; the game never resumes. | Incorrect but recoverable — debug/QA workflow only (a developer testing at a paused breakpoint has to remember to also un-pause via the HUD, not just via the speed keys); does not affect normal play since players don't have debug mode. Root cause: `src/logic/gameLoop.ts` `tick()` checks `state.playerPaused` unconditionally and returns before ever considering `state.debugMode`/`state.debugSpeed` — the `playerPaused` flag has no path back to `false` except the HUD's own Play/Fast-Forward buttons. |

No other Bug or Already-Tracked findings surfaced during this pass. Everything under "Targeted Exploration" above matched spec.

## Notes for the human

- F1 is a pre-existing logic gap unrelated to today's diff (it lives in `gameLoop.ts`'s pause-precedence ordering, not in any of the new animation code) — surfaced only because this pass specifically probed the pause/debug-speed interaction per the task brief. Worth a `specs/DEBUG.md` wording clarification either way: either the doc should carve out an explicit exception for player Pause (if that's the intended behavior), or `tick()` should let a non-zero debug speed override `playerPaused` while debug mode is on (if the doc's current wording is the intended behavior). Not added to `specs/memo.md` or the Bug Log myself, per scope rules.
- All new animation/fx code (`src/render/renderTrains.ts`, `renderStations.ts`, `renderPassengers.ts`, `src/logic/gameLoop.ts`'s `passengerFx` pruning) is purely a function of `state.gameTimeMs`, which is itself gated by the same `tick()` early-returns as everything else — so by construction, once F1 is set aside, "does it freeze correctly" reduces to "does `gameTimeMs` stop advancing," which was verified true for both player Pause and debug speed 0, and Milestone Choice pause.
- No visual regressions found from the light in-train icon color change or the new fx layer's draw order (between stations and trains, per `themes/metro.md` §7).

---

**Follow-up (same day)**: F1 was fixed immediately after this report — `tick()`'s `playerPaused` early-return now only applies while debug mode is off, matching `DEBUG.md`'s existing Speed Control wording (keyed debug speeds take precedence; turning debug off restores the player's paused state). Logged as B15 in `themes/metro.md` §11 and verified with a targeted Playwright flow (pause → debug on → speed key resumes; debug off → paused again) plus a full 21/21 suite re-run.
