# Bug Log Regression Check — 2026-07-11

Scope: re-verify every entry in `specs/themes/metro.md` §11 Bug Log (B1–B22) still holds
after this session's changes (audio system, Game-Over Continue relief fraction, debug
`U` auto-tutorial override). Baseline run + targeted debug-mode re-verification of the
highest-regression-risk entries, plus a general B2/B3 stability pass.

## 1. Baseline: `cd testing && npm test`

20 tests total (14 desktop, 6 mobile). **15 passed, 5 failed** — all 5 failures are in
the `mobile` project's pixel-sampling assertions and are **not new**: same failure set
as the pre-existing, already-flagged harness issue. See §4 below for root-cause detail
(narrower than previously assumed).

Desktop: all 14 pass, including `overflow-gameover.spec.ts`, `restart.spec.ts`,
`weekly-upgrade.spec.ts` (reaches week 5, picks New Train, `hud-depot-carrier` shows
×1), `passenger-direct-delivery.spec.ts`, `passenger-transfer-routing.spec.ts` (both
sub-flows), `draw-line.spec.ts`, `debug-mode.spec.ts`, `boot-and-start.spec.ts`.

Mobile: `touch-basics` (fit/rotate/one-finger-pan), `touch-pinch-zoom` (both) pass.
`touch-basics` single-finger-drag, `touch-basics` two-finger-pan, and all 3
`touch-delete-line` tests fail.

## 2. Bug Log entries actively re-verified (via debug mode, throwaway `testing/flows/*`
scripts written, run, and deleted after — never committed, `testing/` left clean)

| ID | Re-verification method | Result |
|---|---|---|
| B6 | Drew two Lines sharing Station T1 (circle→triangle, square→triangle), computed the actual endpoint-handle position for the square-triangle Line's end tab (`ENDPOINT_HANDLE_LENGTH=24` from station center along that Line's own extension direction), dragged from exactly that handle to a new debug station. | **Still fixed.** Only the dragged Line (blue, square→triangle→star) extended; the other Line (red, circle→triangle) rendered pixel-identical to before the drag — confirmed both by exact-color pixel sampling and a screenshot. |
| B7 | Drew a Line, enabled debug mode, screenshotted the full HUD+canvas with the new mute button (top-left of top bar) and debug overlay (top-right) both on screen simultaneously. | **Still fixed.** No visual overlap — debug panel starts well below the HUD bar; mute icon and debug panel occupy disjoint regions. |
| B8 | Covered by `overflow-gameover.spec.ts` (baseline run) — queue reaches capacity via 6 debug-added passengers, `forceAdUnavailable`, Risk Timer expires at 4x speed, phase reaches `gameover`. | **Still fixed** — confirmed passing in baseline. |
| B9 | Drew a Line, advanced to week 5 via debug speed to earn a free Reserve Train (Weekly Upgrade choice), then — with debug mode still ON — selected the Depot Train HUD button and clicked the Line. | **Still fixed.** `hud-depot-carrier` count went from ×1 → ×0, confirming the Reserve-assignment branch is still checked before the debug-mode branch in `onMouseDown`. |
| B16 | Drew two separate Lines both between the same Station pair (circle↔triangle). | **Still fixed.** Both Lines render as visibly distinct mirrored arcs (red and blue), neither overlapping nor invisible. |
| B17 | Triggered Station overflow **without** calling `forceAdUnavailable` (ad available, the default) — 6 debug-added passengers, Risk Timer expires at 4x speed. | **Still fixed.** The "Station Overflow! Watch an ad to continue?" prompt appeared and phase stayed `playing` (did not skip to `gameover`). Accepting → simulated ad → bonus choice → picking "New Train" all worked, phase remained `playing`. |
| B21 | Continuing directly from the B17 repro: screenshotted the relieved Station immediately after resolving the bonus choice, then again 3s later. | **Still fixed.** The just-relieved Station's border rendered as plain black (no red "approaching"/at-risk glow) immediately after relief, and the game was still `playing` (not re-overflowed) 3s later. |
| B22 (override direction) | `forceAutoTutorialOff` (`d` then `u`) on a fresh context, then Play, via the real Playwright test runner. | **Still fixed** — tutorial did not appear, confirmed on both `desktop` and `mobile` projects, 3 repeated runs each. *(One methodological note: an ad hoc raw `chromium.launch()` script bypassing the Playwright test-runner fixtures reproduced the override silently failing to arm on every run, on both desktop and mobile. Root-caused this to the raw script itself, not the app — the same key sequence run through the real `npx playwright test` harness (the only environment that matters) suppressed the tutorial reliably every time. Flagging only because it's a good trap to be aware of if writing future ad hoc repro scripts outside the test runner.)* |
| B22 (default direction) | Fresh context, Play clicked **without** ever pressing `U`. | **Still fixed** — the "Welcome!" tutorial card appeared as expected on both `desktop` and `mobile` projects, and "Skip tutorial" correctly dismissed it and handed control back. |
| B2 / B3 | ~24s of continuous free-play at 4x debug speed with 3 Lines drawn (station+passenger auto-spawn on), watching for `pageerror`/`console.error` and visually confirming no duplicate station labels. Separately, a 20s high-speed run with only station auto-spawn on. | **No regressions.** Zero console/page errors across both runs. Score and week advanced steadily and monotonically (no freeze). New stations spawned with correctly sequential, non-colliding labels (C2, X1, T2 alongside the original C1/T1/S1). Debug event log showed correctly color-coded entries (green delivered, white boarded, red skipped) per `DEBUG.md`. |
| B11 (source check, since HUD.tsx changed for the mute button) | Read `HUD.tsx`'s hold-to-delete state. | **Still intact** — `holdingLineIds: Set<string>` / `holdTimersRef: Map<string, number>`, the per-Line keyed fix from B11, untouched by the mute-button diff. |
| B14 / B15 (source check) | Grepped for `canReach` in `passengers.ts` (still absent) and `gameLoop.ts`'s `playerPaused` guard (still gated on `&& !state.debugMode`). | **Still fixed**, no reintroduction. |

## 3. Lower-priority Bug Log entries (B1, B4, B5, B10, B12, B13, B18, B19, B20) —
not deep-dived this pass (outside this session's changed files, and several are
real-device-Android-only). B4/B5 (transfer/anti-bounce) are exercised end-to-end by
`passenger-transfer-routing.spec.ts`, which passed in baseline. B12 (week-counter
drift at 4x) is exercised by `weekly-upgrade.spec.ts` reaching exactly week 5, which
passed. No symptom matching any of B1/B10/B13/B18/B19/B20 was observed incidentally
during the rest of this session's exploration. A quick screenshot of the Home Screen's
top-right icon row (new mute icon added alongside Sign In / Collectibles) showed all
three icons cleanly spaced with no overlap — a light B19/B20-adjacent sanity check,
since `HomeScreen.tsx` was touched this session.

## 4. Root-cause note on the 5 pre-flagged mobile harness failures (not a new bug,
narrows down the existing known issue)

The task description characterized the 5 failing mobile tests as blocked by "touch-drag
doesn't actually draw a Line" (a CDP touch-dispatch problem). Investigating further:
**real touch-drawing works correctly** — confirmed by reading the canvas pixel at the
correct location. The actual root cause is that `testing/helpers/gameDriver.ts`'s
`getCanvasPixel` / `getCanvasPixelAtLocal` call `ctx.getImageData()` with raw
CSS-space coordinates, never multiplying by `window.devicePixelRatio`. Since
`ac8c5e4` ("Supersample canvas for HiDPI screens"), the canvas backing store is
`devicePixelRatio`× larger than CSS-pixel space. On `desktop` project (headless
Chromium, DPR 1) this is a no-op and every existing pixel-based assertion happens to
still work; on the `mobile` project (`devices['iPhone 13']`, DPR 3) every raw
`getImageData` call reads a completely wrong location, landing on backdrop-colored
pixels ~9x closer to the origin than the intended sample point.

Verified directly: after a real touch-drag between the circle and triangle Stations,
sampling `ctx.getImageData(Math.round(px * dpr), Math.round(py * dpr), 1, 1)` at the
same logical location the existing (unscaled) assertion checks returns the exact
expected Line color `[231, 76, 60]` — the drawn Line is there, the harness assertion
is reading the wrong pixel address. The same DPR-correction also fixes the two-finger
-pan test's failing pre-pan sanity check (`STATION_FILL` now found where expected).

This is a **testing-harness defect** (`testing/helpers/gameDriver.ts`), not a `src/`
regression — flagged here only because it changes the actionable next step: fixing
`getCanvasPixel`/`getCanvasPixelAtLocal` to multiply by `window.devicePixelRatio`
before calling `getImageData` would very likely turn all 5 currently-failing mobile
tests green, since their actual game-behavior preconditions (touch-drawing a Line,
touch-panning) are met — only the assertion helper is broken. Per this task's scope
(no `src/` edits, no `testing/` edits beyond throwaway scratch files already deleted),
this fix was not applied — reporting it as a finding for a human to pick up.

## 5. Findings

| ID | Flow | Classification | Symptom | Expected | Repro Steps | Severity |
|---|---|---|---|---|---|---|
| F1 | free-form (harness investigation, `testing/helpers/gameDriver.ts`) | Already Tracked (narrows an existing known issue) | The 5 mobile-project test failures previously attributed to touch-drag not drawing a Line are actually caused by `getCanvasPixel`/`getCanvasPixelAtLocal` never accounting for `window.devicePixelRatio` when calling `ctx.getImageData()` — on the `mobile` project (DPR 3, since the `ac8c5e4` HiDPI-supersampling commit) every raw pixel sample reads the wrong canvas location. Touch-drawing and touch-panning both work correctly; only the assertion helper is broken. | `getCanvasPixel`/`getCanvasPixelAtLocal` should sample the correct backing-store pixel regardless of `devicePixelRatio`. | Real touch-drag circle→triangle on `mobile` project; sample `ctx.getImageData(Math.round(localX * window.devicePixelRatio), Math.round(localY * window.devicePixelRatio), 1, 1)` at the same logical point the existing assertion uses — returns the expected Line color `[231,76,60]`, while the existing unscaled sample returns a backdrop tone. | Incorrect but recoverable (harness-only; blocks 5 mobile tests from ever passing regardless of app correctness) |

No `src/`-level regressions found. Every actively re-verified Bug Log entry (B2, B3,
B6, B7, B8, B9, B11, B14, B15, B16, B17, B21, B22) is still fixed exactly as
`themes/metro.md` §11 describes.

## 6. Summary for the human

- **B6, B7, B8, B9, B16, B17, B21, B22 (both directions)** — all actively re-verified via
  fresh debug-mode-driven repros this session. None regressed.
- **B2/B3** — a ~44s combined free-play stress pass (high debug speed, multiple Lines,
  station/passenger auto-spawn) produced zero console/page errors and correctly
  sequential, non-colliding entity IDs.
- **B11, B14, B15** — confirmed via source read (not deep re-run) since their owning
  files were touched only incidentally (HUD.tsx for the mute button) or not at all.
- **B1, B4, B5, B10, B12, B13, B18, B19, B20** — no regression observed, but not
  independently re-driven beyond what the existing passing suite + incidental
  exploration already covers (several are real-device-Android-only and can't be
  verified in this headless environment at all).
- **One finding (F1, "Already Tracked")**: the pre-existing 5 failing mobile Playwright
  tests are actually blocked by a DPR-unaware pixel-sampling bug in
  `testing/helpers/gameDriver.ts`, not by touch dispatch — real touch-drawing works
  fine. Worth a human fixing `getCanvasPixel`/`getCanvasPixelAtLocal` to multiply by
  `devicePixelRatio`, since it would likely unblock all 5 tests at once.
