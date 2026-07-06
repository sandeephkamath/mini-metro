# Test Report — 2026-07-06 — Mobile Rotation + Snap-Tolerance QA Pass

Focused re-verification pass after two real-device-driven fixes landed since the last mobile QA pass (`testing/reports/2026-07-06-mobile-touch-qa.md`, which found and got B11 fixed):

1. Portrait viewports now rotate the whole game stage 90° before scaling (`src/components/GameCanvas.tsx`, `src/hooks/useMouseInput.ts` — `specs/themes/metro.md` §6.1).
2. Line-drawing drag completion now uses a wider "drop tolerance" radius with nearest-station-wins snapping (`src/logic/stations.ts` `getStationAt`, `src/input/mouseHandler.ts`, `CONFIG.STATION_DROP_RADIUS` — `specs/core/logic.md` §4).

## Full harness run

`npm test` (both Playwright projects): **19 passed, 1 failed** out of 20.

- `desktop`: 7/8 passed. The 1 failure (`weekly-upgrade.spec.ts`) is **Already Tracked** — matches `specs/memo.md` "Bugs" section verbatim (the B8-overflow-gate-fix side effect: an unmanaged, zero-lines-drawn session now genuinely overflows before week 5 at 4x debug speed). Confirmed again, no new information.
- `mobile`: 10/10 passed — Responsive Fit, Rotate-to-Fill, Touch Draw, Touch Pan, both Pinch Zoom flows, both Touch Hold-to-Delete flows including the B11 regression test (3 concurrent-touch-hold variant re-verified further in free-form, below).

## Screenshot review (fixed mobile flows)

Mapped each attachment back to its originating test via the HTML report's embedded JSON (`report/index.html`'s base64 zip) rather than guessing from file size, then opened every image:

- **Rotate-to-Fill** (`touch-basics.spec.ts`): canvas bounding box is taller-than-wide on the iPhone 13 portrait viewport (390×844), confirming the stage is actually rotated, not just letterboxed.
- **Touch Pan** (`touch-basics.spec.ts`, before-pan/after-pan): before shows all 3 fixed stations (circle/triangle/square) rendered correctly inside the rotated stage, with the HUD's vertical text ("Week 0 · Level 0", "drag between stations...") correctly rotated too. After-pan shows two stations moved out of frame and one (square) repositioned — a real pan, not a no-op.
- **Pinch Zoom** (`touch-pinch-zoom.spec.ts`, before/after-pinch-in): before shows all 3 stations at default zoom; after (pinch out, dist 20→100, nominal ~5x request) shows a fully blank canvas — expected, not a bug: `CAMERA_MAX_ZOOM` (2.5×) clamps the actual zoom, and at 2.5× centered near the screen/pinch midpoint (which sits roughly at the stations' centroid, not on top of any one station), none of the 3 stations remains within the now-320×240-world-px view. Confirmed by hand-computing the clamped viewport extent against each station's world position.
- **Repeated pinch-in past zoom-out limit**: final screenshot shows all 3 stations shrunk near center, consistent with `CAMERA_MIN_ZOOM` clamping, no corruption, no page errors.
- **Touch Hold-to-Delete** (`touch-delete-line.spec.ts`): both single-swatch tests and the two-swatch concurrent-hold (B11 regression) test still pass, confirmed via pixel sampling (no screenshots for these).

## Free-form exploration (this pass's focus)

All of the below used throwaway Playwright spec files under `testing/flows/` and `testing/flows/mobile/` (per `specs/testing.md` §4), run once, screenshots inspected, then deleted — none committed, none left behind (`git status` on `testing/` is clean).

### Snap-to-node drop tolerance (desktop mouse)
- Release 35px from a station center (inside the 40px `STATION_DROP_RADIUS`): connects correctly.
- Release 45px from a station center (outside tolerance): correctly fails to connect — no line drawn, no crash, drag just cancels per `core/logic.md` §4 ("Releasing anywhere other than a valid Node cancels the drag").
- Debug-placed a second station only 50px from an existing one (bypassing normal min-spacing, per `DEBUG.md`), then released a drag at a point 15px from one / 35px from the other (both within the 40px radius simultaneously, an overlap only reachable because debug mode skips the normal 90px min-spacing that otherwise guarantees no ambiguity): the **nearest** station won the connection every time — confirmed both via pixel sampling and a full screenshot showing the line correctly terminating at the closer station. `getStationAt`'s closest-first loop is correct.

### Snap-to-node drop tolerance (mobile touch, rotated presentation)
- Same 35px-inside / 45px-outside test repeated via real touch dispatch under the rotated portrait stage: identical correct results (connects inside, fails outside).
- Repeated a successful in-tolerance connection 3 times in the same session (circle→triangle, then a deliberate near-miss attempt, then circle→square) to confirm the rotated coordinate math is stable across repeated gestures, not just a single lucky one — all repeats resolved correctly (verified via screenshot: correct final line topology, no drift, no phantom connections from the near-miss attempt).
- Mid-Line insertion under rotation: dragged from a point along an existing line's segment, released 45px from a new station (outside tolerance, correctly no insertion), then retried at 35px (inside tolerance, correctly inserted) — final screenshot shows a single clean 3-station line (circle→triangle→square) with no duplicate/branching segments.

### Start-of-drag precision (unchanged behavior, sanity-checked under rotation)
- Starting a touch drag 25px from a station center (outside the 20px `STATION_HIT_RADIUS`) correctly does **not** start a line — confirmed this is still strict/precise post-rotation, matching `core/logic.md` §4's intentional start/end asymmetry.
- Starting 15px away (inside the radius) correctly still starts the line.

### B11 regression, extended (3 concurrent touches instead of 2)
- Extended the original 2-touch B11 regression test to 3 simultaneous touches on 3 different Line swatches, released at three different times relative to the 600ms hold threshold (t1 released ~200ms → should cancel, t2 released ~450ms → should cancel, t3 held to ~750ms → should delete). All three resolved independently and correctly: t1 and t2's lines survived, t3's line was deleted — confirmed via pixel sampling and a screenshot showing exactly 2 lines remaining (the 3rd cleanly gone, no visual artifacts). The per-Line `Set`/`Map`-keyed fix for B11 generalizes correctly beyond the 2-touch case it was fixed for.

### Pinch starting mid single-finger drag (rotated)
- Started a single-finger drag from a station toward empty space, then added a second finger mid-drag to trigger the pinch path, under the rotated stage. No page errors; the in-flight single-touch drag was cleanly cancelled (equivalent to a mouse-up over empty space) before the pinch took over, and no spurious line was created. Consistent with the same check already confirmed pre-rotation in the previous mobile QA pass.

### Two-finger pan (previously never actually exercised by the fixed suite)
- Noted that `testing/helpers/touchDriver.ts`'s `touchPan()` helper is imported in `touch-basics.spec.ts` but never actually called by any test in the file — the "Two-Finger Pan" flow from `specs/testing.md` §3.1 has a ready-made helper but no real assertion anywhere in the committed suite. Wrote a throwaway test to check it directly post-rotation: pinch distance held constant while the midpoint moves diagonally. Before/after canvas screenshots show all 3 stations translated by a consistent offset with **no size change** (i.e., a pure pan, not an inadvertent zoom) — confirmed by eye that station circle diameters are pixel-identical before and after. No bug, but flagging the coverage gap below.

### Landscape small-viewport regression check
- A landscape-shaped (700×400) viewport — smaller than native but wider than tall — correctly does **not** trigger the rotation path (canvas bounding box stays wider-than-tall), and mouse-equivalent line-drawing still resolves correctly at that scale. Confirms the portrait-only condition (`window.innerHeight > window.innerWidth`) isn't accidentally triggering rotation for small-but-landscape windows.

## Findings

No new findings and nothing matching an already-tracked bug was reproduced. Every scenario in scope for this pass — rotation correctness (repeated, not just once), snap-tolerance behavior at the boundary (both just inside and just outside, both input methods), tolerance-driven ambiguous-station resolution, and the B11 fix generalizing to 3+ concurrent touches — behaved exactly per `specs/core/logic.md` §4 and `specs/themes/metro.md` §6/§6.1.

The only pre-existing failure (`weekly-upgrade.spec.ts`, desktop) is unrelated to this pass's scope and is **Already Tracked** per `specs/memo.md`.

## Notes for whoever picks this up

- **Coverage gap, not a bug**: `specs/testing.md` §3.1 lists "Two-Finger Pan" as a fixed mobile flow, and `testing/helpers/touchDriver.ts` already has a `touchPan()` helper for it, but no committed spec file actually calls it (it's imported once in `touch-basics.spec.ts` and never used). Worth adding a real `two-finger-pan` test to `testing/flows/mobile/` — I verified the underlying behavior is correct by hand via a throwaway script, but there's currently no permanent regression coverage for it.
- The pinch-zoom fixed test's "after" screenshot being blank (all stations zoomed out of view) is expected given `CAMERA_MAX_ZOOM` clamping and where the pinch midpoint lands relative to the station cluster — not a bug, but worth a comment in `touch-pinch-zoom.spec.ts` if a future reader is confused by an apparently-empty "zoomed in" screenshot.
- All throwaway exploration scripts were deleted after use; `git status` on `testing/` shows no stray files from this pass.
