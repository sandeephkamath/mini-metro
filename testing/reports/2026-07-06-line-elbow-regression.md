# Test Report — 2026-07-06 — Frozen Line-Elbow (B16 fix) Regression Pass

**Focus of this run**: regression-test the just-landed change moving each segment's bend
("elbow") orientation from a live per-frame recompute to a one-time choice at segment
creation (`chooseSegmentElbow`), stored frozen in `MetroLine.elbows` (parallel to
`stationIds` pairs) and read via the now-pure `getSegmentElbow`. This is the fix for B16
(`themes/metro.md` §10: two Lines drawn between the same Station pair used to render
identically/overlapping instead of mirrored). Full fixed suite + free-form exploration of
every elbow-bookkeeping code path per the task brief.

## Suite result

`cd testing && npm test`: **21 passed, 0 failed**, run twice (once before free exploration,
once after) with identical results — no flakes. Both `desktop` and `mobile` Playwright
projects included.

## Headline answer: did the elbow-freeze change introduce any regressions?

**No new Bug or New Finding.** Every scenario the task called out was exercised and
verified — visually via screenshots and, for the append case, with a numeric pixel check
— and all matched `core/logic.md` §2 Route / §4 Route Drawing Interaction and
`themes/metro.md` §7 item 2 exactly.

### Scenarios exercised

1. **Two Lines drawn between the same Station pair (the exact B16 symptom).** Drew
   circle→triangle twice (as two separate Lines, `l1` red then `l2` blue). The two Lines
   take visibly distinct, mirrored bend paths — red bends up-then-flat into the triangle's
   top, blue bends flat-then-up into the triangle's side — neither hidden under the other.
   Confirmed again with a third Line (green, circle→square) added at the same shared
   Station: all three tabs at the circle fan out to stay individually grabbable
   (`ENDPOINT_HANDLE_MIN_ANGLE`), and all three Line bodies stay visually distinct with no
   overlap.
2. **Extend from an end tab (append).** Drew a 2-Station Line, then dragged from the
   computed real tab position (`end + normalize(end − elbow-or-neighbor) × 24px`, matching
   `endpointAngle`/`getLineEndpoints`) to a third Station. The pre-existing segment's bend
   was pixel-identical before and after (verified both visually and via
   `getCanvasPixel` sampling three points along the untouched leg — no background-color
   gap appeared post-append, i.e. no stale/shifted geometry).
3. **Extend from an end tab (prepend).** Same as above but grabbing the *front* tab and
   extending backward to a debug-added Station. The already-drawn far segment
   (triangle-ward) kept its exact original bend shape; the new near segment got its own,
   independently-computed bend into the new Station. Correct per spec ("Nodes can be added
   at either end").
4. **Shorten gesture.** Drew a 3-Station Line (circle→triangle→square, one Train running),
   grabbed the back end tab, dragged inward onto the middle Station to mark the far Station
   for detachment, released. The remaining circle→triangle segment kept its exact original
   bend shape (`line.elbows.pop()`/`shift()` bookkeeping intact), the detached leg rendered
   faded during the drag as specced, and the Train — which was mid-transit toward the
   removed Station at the time — relocated to the new terminal (triangle), stopped there,
   then continued inward correctly (`core/logic.md` §4 "Releasing").
5. **Mid-line insertion.** Drew a 3-Station Line, added a debug Station near the
   circle→triangle segment's straight leg, dragged from a point on that segment to the new
   Station. The segment split into two fresh, independently-chosen bends; the untouched
   neighbor segment (triangle→square) kept its exact original shape, confirmed unchanged
   pixel-for-pixel against the pre-insertion screenshot.
6. **Line deletion via HUD legend swatch hold, then redraw.** Held the `l1` swatch past
   `DELETE_HOLD_MS` (600ms) to delete a circle→square Line, redrew the same color slot
   between a *different* pair (circle→triangle) — correct fresh geometry, no leftover
   artifact from the deleted Line. Repeated with deletion + redraw of the *same* pair
   (circle→square) — also produced clean, freshly-recomputed straight geometry, no stale
   elbow reuse.
7. **Toggling debug mode mid-drag.** Started a circle→triangle drag, pressed `D` twice
   (on then off) with the mouse still down mid-gesture, then continued the drag to
   completion. The gesture was unaffected (`onMouseMove`/`onMouseUp` don't gate on
   `debugMode`, only `onMouseDown` does) — the Line committed normally with correct,
   undistorted geometry. Not a regression, consistent with prior confirmed behavior
   (see `2026-07-05-train-track-bend-regression.md`).
8. **Touch: two-finger pinch starting mid single-finger drag.** Started a single-finger
   touch-drag from circle partway toward triangle, then added a second touch mid-gesture
   (simulating a hand transitioning from a one-finger drag into a pinch). The in-progress
   Line drag correctly cancelled with no partial commit (nothing was chained, per
   `core/logic.md` §4 "Releasing with nothing chained... cancels the drag with no effect"),
   and control handed off cleanly to the two-finger pinch/pan path — camera zoom changed by
   the expected ratio for the finger-spread delta given, no runaway or unstable zoom.
9. **Touch: hold the delete swatch, then drag the finger off it before releasing.** Touched
   down on the `l1` swatch, held partway into the 600ms threshold, dragged the finger well
   outside the swatch's bounds (still touching), held past 600ms total, then released. The
   Line was still deleted — expected, since `HUD.tsx`'s hold-to-delete only wires
   `onTouchStart`/`onTouchEnd` (no `onTouchMove`/`onTouchCancel`), and touch events keep
   targeting their original element regardless of on-screen finger movement. Not a spec
   violation (`core/logic.md` §4 only specifies press/hold-duration and early-release-
   cancels; it says nothing about drag-off) — noted here as a confirmed behavior, not a
   finding.

## Findings

No rows — no Bug, Already Tracked, or New Finding was produced by this run. Every mismatch
candidate investigated during exploration (see Method notes) turned out to be a test-script
artifact, not a game behavior issue.

## Confirmed correct (no findings)

- **B16 itself stays fixed** across every combination tried: repeated same-pair Lines,
  3-way shared-Station conflicts, append, prepend, mid-line insertion, shorten, and
  delete+redraw (both same-pair and different-pair) all produce mirrored/independent,
  non-overlapping geometry exactly as `chooseSegmentElbow`'s doc comments describe.
- **Elbow bookkeeping stays aligned with `stationIds`** through every mutation path
  exercised (`appendStation`, `prependStation`, `insertStationIntoLine`,
  `removeStationFromLineEnd`, `removeLine`) — never observed a shifted-by-one bend, a
  segment rendered with the wrong neighbor's bend, or a Train diverging from its drawn
  track after any of these operations.
- **Drag preview matches committed geometry** in every case (`renderLines.ts`'s preview
  now calling the same `chooseSegmentElbow`) — no visible "snap" or shape change between
  the dashed/faded preview and the final committed Line.

## Method notes

- All free-form scenarios were driven via throwaway `testing/flows/_scratch-*.spec.ts`
  files (both `desktop` and `mobile` projects) plus a couple of `run-driver.mjs` REPL
  sessions for quick geometry sanity checks; all throwaway files were deleted after use,
  per isolation rules — none remain in the repo (`git status` was clean of anything under
  `testing/flows/` at the end of this run).
- Computed exact end-tab and elbow positions by importing `computeElbow` from
  `src/logic/geometry.ts` directly into test scripts (read-only) rather than guessing pixel
  offsets from screenshots — this made repro scripts exact and reusable rather than
  trial-and-error.
- One false lead worth recording for future runs: an early debug-station placement at a
  world position outside the Camera's current auto-fit view (`core/logic.md` §5) silently
  missed the canvas element entirely (`canvasPoint` maps to a real screen coordinate
  outside the canvas's bounding box, so the click lands on the page background instead) —
  this looked at first like `debugAddStation`/click-based placement was broken, but was
  purely a test-script coordinate-choice mistake, not a game bug. Confirmed by checking
  `__miniMetroDebug`'s live camera/viewport and the canvas bounding box directly. Resolved
  by keeping all debug-added Stations within the live camera's visible world range.
- A second false lead: a pixel-level before/after comparison at a fixed world point along
  an untouched segment occasionally disagreed because a Train (rendered as a darkened
  shade of the Line's color) happened to occlude that exact pixel at one sample time but
  not the other — not a geometry change. Reworked the assertion to check "not background
  color" (still-on-track) rather than exact color equality, consistent with the same caveat
  already documented in `touch-delete-line.spec.ts`.
