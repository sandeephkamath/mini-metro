# Original Mini Metro — UI & Timing Deep-Dive (Research Notes, Part 2)

**Purpose**: a second research pass, focused specifically on UI behavior, the overflow-timer's exact trigger/presentation, pausable animations, train speed vs. game speed, and line bend geometry — areas the first pass (`mini_metro_original_analysis.md`) either didn't cover or only guessed at. This is **not a spec**. Cross-check against `core/logic.md`, `core/progression.md`, `themes/metro.md` before acting on anything here.

**Source**: YouTube video `"DOMINATING New York in \"Mini Metro\""` (quill18, uploaded 2023-11-14, 41:32 runtime). Two full playthroughs on the **New York** map (chapters: 0:00 Intro, 1:40 Game 1 "Explanation & Warm-Up," 19:50 Game 2 "SERIOUS TIME"), **with continuous spoken commentary** — a meaningfully better source than the first video because the player narrates *why* he's doing things and occasionally states the mechanic explicitly out loud.

**Method**: downloaded via `yt-dlp` (format 18/360p) same as before. This video **has auto-generated captions**, unlike the first — pulled the `.vtt`, deduplicated the rolling-caption overlap into a clean transcript, and grepped it for mechanic-relevant keywords before doing any frame sampling. Then extracted full-resolution frames at the exact timestamps the transcript flagged as interesting, plus dense 0.5s-interval sampling across the two windows that mattered most (the overflow-timer sequence, and the line-deletion demo). Reference screenshots are saved in `specs/research/reference_screenshots/nyc_analysis/` (see §8 for the index).

**Correction notices**: two things I initially misread from small/compressed crops, then caught by sampling more densely and zooming in — flagged inline in §2 and §8 so the same mistake isn't repeated. Leaving the trail in because it's informative about what *not* to conclude from a single low-res frame.

---

## 1. Overflow Timer — What Actually Triggers It and How It's Shown

This was the main target of this pass. The transcript gives a rare direct explanation, at 00:09:34–00:10:21 (paraphrased from the player's own words):

> "There is a maximum capacity for each one of these stations. If you go above the capacity — I'm not actually sure what the number is, it might be six or eight — what's going to happen is a timer will start to develop around the site, and if that timer fills up, you lose... you can see the timer counting down over here cuz this is overly full, I'm going to use one of my extra locomotives."

And later, at 00:19:42–00:19:47, the player states an explicit (but self-admittedly uncertain) hypothesis:

> "I don't think you can lose while a train is working the station — I think the timer pauses."

**Confirmed by direct frame inspection**: the clearest, most reliable visual cue for "a station somewhere is in overflow risk" is **the pause-button icon in the top-right HUD turning from its normal black/white clock-face into a solid dark red/maroon fill**. Verified by sampling the exact window the player is narrating over (578–598s, 0.5s resolution): the icon is normal black/white for the first ~30 of 40 sampled frames, then turns solid red for the last several, then — 35–50 real seconds later, once the player has relieved the congestion with a spare locomotive — reverts to normal black/white. See `specs/research/reference_screenshots/nyc_analysis/03_overflow_clock_icon_progression.png` for the exact sequence (8 crops across the transition) and `02_overflow_warning_context.png` for the full-map context at the moment it's red.

**Not confirmed / inconclusive**: a distinct *per-station* ring or pie-countdown visual. I looked hard for one (see the false leads in §8) and could not find a clean, unambiguous example at 360p — the player's own phrase "there may have been a slightly different glow around this" (said tentatively, not confidently) suggests it's genuinely subtle even to someone watching live at full resolution. It's plausible the real per-station cue is a color/tint shift on the queued-passenger icons at that station (they may render in a warning tint once over capacity) rather than a separate ring shape, but I couldn't verify this cleanly from compressed 360p footage. **Don't treat "no ring" as confirmed absence — treat the global red-icon cue as the one high-confidence finding here, and the per-station visual as an open question.**

**On the "timer pauses while a train is servicing the station" hypothesis**: the player says this out loud but immediately follows it with "we're still going to lose, it didn't drain enough" — i.e. his own run doesn't actually prove or disprove the hypothesis, because even if true, the train didn't clear enough of the queue in time regardless. I'd treat this as **an interesting design idea to weigh, not a confirmed original-game rule**. Notably, this project's own spec (`core/logic.md` §3 Node Overflow) does *not* have this rule today — Recovery is purely queue-length-based ("if the queue length drops back below capacity while the Grace Timer is still running"), with no exception for an actively-servicing Carrier. If a train arriving and partially draining the queue doesn't bring it back under capacity, the Grace Timer keeps running in this project's model regardless of whether a train is "at" the station — which seems like the more defensible rule design (a train mid-service isn't a resolved crisis until the queue is actually back under the threshold), so I'd lean toward *not* adopting the pause-while-servicing idea rather than toward adopting it.

---

## 2. Pausable Animations — What Freezes

Confirmed by comparing 6 consecutive full-res frames spanning 5 real seconds during an active Weekly Upgrade popup (`00:04:41`, Week 2 choice): the **entire map — line paths, station layout, and background — is uniformly dimmed/faded and static across all 6 frames**. Nothing detectably moves. This directly matches this project's existing spec (`core/logic.md` §3 Milestone Events: "presenting the choice pauses game time... every timer in the game... freezes until the player picks") — good independent confirmation, not a new finding, but worth having the visual proof. See `07_weekly_upgrade_popup_paused.png`.

**Correction**: in an early pass at this same footage, a reddish textured block sitting on the track just below a station looked like it could be a distinct "overflow queue" visual (i.e., a second candidate for the per-station warning in §1). Zooming in tighter (`01_line_bends_45deg_train_sprite.png` and the discussion in §4 below) showed it's actually just **a train sprite carrying passengers** — a lighter/pastel tint of the line's color, capsule-shaped, with small passenger-icon texture visible inside representing onboard riders. Recorded here so the same misread doesn't get repeated: a train stopped at/near a station, especially one rendered in a lighter tint, is easy to mistake for a station-level warning indicator in a low-res crop. Always check by tracking the same object across multiple frames before concluding it's state rather than a moving sprite.

---

## 3. Player-Facing Speed Controls (Pause / Play / Fast-Forward)

Confirmed via direct zoom on the top-right HUD stack (`04_pause_play_fastforward_controls.png`): there are **three distinct, always-visible, player-facing buttons**, stacked vertically under the day-of-week clock icon:

1. **Pause** (rendered as `II` bars)
2. **Play / normal speed** (rendered as a `▶` triangle)
3. **Fast-forward** (rendered as a `▶▶` double-triangle, shown in a lighter/gray tone when not the active selection)

The transcript confirms this is a real, actively-used feature, not a debug-only tool: *"you can say oh it's so calm and relaxed now, we can fast forward a little as well, there you go, higher speed but still very calm and relaxed"* (00:03:11). The player uses fast-forward routinely to skip uneventful stretches and switches back to normal/pause when actively planning.

This is directly relevant to this project's own backlog: `memo.md`'s FTUE section currently notes *"No pause functionality outside of debug mode's speed controls... Debug mode's spawn-pause (S key) exists but is explicitly developer/QA tooling per specs/DEBUG.md, not a player-facing feature."* This playthrough is a clear demonstration that **the original treats pause/play/fast-forward as a normal, always-available player control**, not something gated behind debug/QA — worth weighing as a concrete feature to promote out of debug-only status.

**Train speed vs. game speed**: I could not pixel-measure train displacement-per-frame cleanly enough at 360p/0.5s sampling to give a hard number, but the qualitative evidence points one way: the player describes the fast-forwarded state as "calm and relaxed," i.e. proportionally scaled, not visually broken or desynced — consistent with a single global time-scale multiplier applied uniformly to every timer and every moving entity (trains, spawn timers, Grace Timers all speed up together), rather than fast-forward only compressing *some* subsystems. I'd treat "one multiplier scales everything uniformly" as the working assumption, matching how a `deltaTime` multiplier would naturally be implemented, but flag that this is an inference from qualitative description, not a directly measured frame-by-frame confirmation.

**No evidence that adding a Carriage slows a train down.** The one moment that sounded on first read like a speed penalty — *"it does slow down blue cuz it's got to go a little further and make an extra stop"* (00:25:21) — is, on closer reading, about **round-trip time increasing because the route got physically longer with an extra stop**, not about the train's per-pixel speed decreasing due to added weight/capacity. No other transcript passage ties Carriage count to speed. Treat trains as constant-speed regardless of passenger load or Carriage count, consistent with this project's own model (`core/logic.md` §2 Carrier: "Carriers move at a fixed speed in pixels per second... maximum Resource capacity, increased only by attaching a Reserve Carriage" — capacity and speed are already separate, unrelated attributes here, and nothing in this footage contradicts that).

---

## 4. Line Bends — Geometry and Rendering

Directly visible in a clean, uncluttered crop of an early 4-station loop (`01_line_bends_45deg_train_sprite.png`):

- **All bends snap to 45°-increment angles.** Every corner in every line observed across both playthroughs is either a straight run or a 45°/90° turn made of one diagonal segment connecting two axis-aligned segments — never an arbitrary angle, never a smooth curve/arc. A simple 4-station loop renders as a "rounded rectangle/stadium" shape purely from 45° corner-cuts, not from any curve primitive.
- **Joins are rounded, not mitred.** The line stroke has a consistently thick, rounded cap/join style, so even a 45° corner reads as a soft, continuous bend rather than a sharp pointed corner — a stroke-rendering choice (round line-join) rather than an actual curved path.
- **Trains render as solid-color rounded-rectangle capsules**, oriented along their current direction of travel (vertical capsule on a vertical segment, horizontal on a horizontal segment, presumably diagonal on a diagonal segment though not directly confirmed), matching the line's color. When a train is carrying passengers, small icon-shaped texture appears inside the capsule representing onboard riders (see the corrected read in §2).
- Stations render on top of the line (the line passes visually behind/through the station shape), with a thick black outline and white fill regardless of which line(s) pass through.

This is directly relevant to this project's own recent work (per `git log`: "Avoid overlapping line bends at shared stations," "Fix trains drifting off drawn track when a line's bend gets mirrored") — the 45°-snap + rounded-join model visually confirmed here is exactly the shape this project's own bend-handling code should be targeting, and is good independent visual ground-truth to compare against if there's ever doubt about what a bend "should" look like.

---

## 5. Line Deletion — Confirmed Gesture (corrects the guess in Part 1)

Part 1 of this analysis (`mini_metro_original_analysis.md` §7) could only infer the deletion gesture indirectly, from before/after states, and explicitly flagged the exact mechanism as "general knowledge, not directly observed." **This pass directly captured it.**

At 00:12:12–00:12:39, the player narrates: *"I want to showcase this one thing... we can go and delete this line, right, we can also do this to quickly delete everything... sometimes it's good to do kind of a big purge over everything and then redraw your lines."* Frame-by-frame around this timestamp (`05_line_deletion_before_after.png`, `06_line_deletion_button_zoom.png`) shows exactly what happens:

- **The gesture is on the line's own color swatch in the bottom-left HUD legend** (the small colored dot representing each line), not a drag on the canvas itself.
- Pressing/holding that swatch **grows it into a large red circle with a white X**, replacing its normal small-dot appearance — a clear "release here to delete this line" confirmation control.
- Releasing while it's in this enlarged red-X state deletes the entire line. In the captured example, the blue line vanishes completely and several outer stations that were only reachable via that line become disconnected (shown as bare shape icons with no line through them) — confirming this is a full-line delete, not a partial/undo-able trim.
- The player explicitly frames this as a deliberate strategic move ("a big purge"), used when a network has gotten tangled enough that redrawing from a clean slate is faster than incrementally fixing it — not just an accidental-drag recovery tool.

This is a concrete, high-confidence answer to the open gap noted in `memo.md` ("If line deletion becomes a priority, revisit this doc's §7 before designing the gesture") and in `themes/metro.md` §10's "Line deletion: Yes (original) / No (current)" divergence row: **the reference UX is "hold/drag the line's own legend swatch, which grows into a red X confirmation, release to delete the whole line."** This is a cleaner, more deliberate gesture than a stray-drag-off-canvas — worth preferring over inventing a new gesture from scratch if/when this gets built.

---

## 6. Station Variety & Interchange Hubs (New York specifics)

New York's map introduces shapes beyond the London set observed in Part 1: confirmed circle, triangle, square, **plus/cross, diamond, pentagon, star** all appear across the two playthroughs (the plus/cross shape appears quite early, within the first ~week, unlike London where it was a late-game unlock — station-shape unlock pacing may be **map-specific**, not a fixed global schedule, worth keeping in mind if this project ever wants per-map shape-unlock tuning rather than one fixed curve). The transcript also gives a rarity ordering directly from the player: *"I think Circle might be the most common, with Triangle being just behind, Square being the least common"* (00:07:33) — a useful, if informal, data point on relative spawn-type weighting if this project ever wants non-uniform type distribution instead of the current "keep type counts roughly balanced" rule (`progression.md` §1).

**Interchange hubs**, visible clearly in late-game New York (`08_lategame_interchange_hubs.png`): an upgraded station renders as a noticeably larger solid dark/black-filled circle (distinct from the small white-filled normal station shapes), overlaid with a small icon. The transcript frames Interchange purely as a congestion-relief tool: *"an interchange... it would speed things up"* (00:16:26), *"interchanges... capacity, it would be perfect for this"* (00:17:20) — consistently discussed as "I really want an interchange here" at whichever station is the current bottleneck, i.e., it's requested reactively in response to congestion, not proactively. Not directly relevant to this project today (no Interchange-equivalent mechanic — see Part 1 §9), but the visual (a bigger, solid-fill station marker) is a clean reference if an equivalent "upgraded/relief" station concept is ever wanted.

---

## 7. Other Confirmed Details Worth Recording

- **Camera auto-zoom-out over time is a real, deliberate original feature**, not something this project invented independently: *"you may have also noticed, it's very subtle, but the screen is slowly starting to zoom out"* (00:03:25), later: *"have you noticed again this subtle zoom out, just wonderful, just really nice the way it does that, you can't tell"* (00:10:41). Good direct confirmation that this project's existing auto-fit camera behavior (`core/logic.md` §5) is matching the real game's intent, not over-building.
- **Bridges/tunnels render as a dashed/dotted line** wherever a route crosses water — confirmed consistently across both playthroughs, matches Part 1's finding.
- **Post-Game-Over menu has a 4th option not seen in the first video's London run**: alongside Restart / Continue in Endless / Menu, this New York playthrough's Game Over screen (`09_game_over_screen.png`) also offers **"Continue in Creative Mode."** New data point for Part 1's §9 — worth adding to this project's `memo.md` as a known original feature this project doesn't have (a sandbox/no-fail continuation mode), not urgent but a real gap now confirmed twice-removed (i.e. via two different cities/sessions, so not a one-off).
- **Weekly Upgrade choice/auto-grant pattern reconfirmed as genuinely variable, not deterministic by week number**: this playthrough's Week 2 was a single auto-granted Locomotive with no choice UI at all (`07_weekly_upgrade_popup_paused.png`), whereas in Part 1's London video, Week 2 *was* a binary choice (Line vs. Tunnels). Since the same week-number produced different behavior in two different sessions, this rules out "week N is always type X" as the rule — it's genuininely session/RNG-dependent (or map-dependent), reinforcing Part 1's "open question" framing rather than resolving it.

---

## 8. Screenshot Index (`specs/research/reference_screenshots/nyc_analysis/`)

| File | Shows |
|---|---|
| `01_line_bends_45deg_train_sprite.png` | Clean 45°-snapped loop, rounded joins, a train capsule mid-segment |
| `02_overflow_warning_context.png` | Full map at the moment the global overflow indicator is active |
| `03_overflow_clock_icon_progression.png` | 8-frame sequence of the top-right icon shifting from normal to red and back |
| `04_pause_play_fastforward_controls.png` | The three-button pause/play/fast-forward stack, zoomed |
| `05_line_deletion_before_after.png` | Full network before and after a line-deletion "purge" |
| `06_line_deletion_button_zoom.png` | Close-up of the enlarged red-X delete-confirmation swatch |
| `07_weekly_upgrade_popup_paused.png` | A Weekly Upgrade popup, showing the dimmed/frozen background |
| `08_lategame_interchange_hubs.png` | Late-game New York network with visible Interchange hub stations and extra shape variety |
| `09_game_over_screen.png` | Game Over screen showing the 4-option menu including Creative Mode |

---

## 9. Suggested Follow-ups (not yet actioned)

- Add "Continue in Creative Mode" as a known-divergence row in `themes/metro.md` §10, now that it's confirmed across two separate sessions/cities.
- If the per-station overflow visual (as opposed to the confirmed global red-icon cue) ever needs to be pinned down precisely, it'll need either a higher-resolution source video or directly opening the Steam game and pausing at will — 360p YouTube compression appears to be a hard ceiling on resolving it further.
- If/when player-facing pause/fast-forward gets built (already an open FTUE question in `memo.md`), this doc's §3 is the concrete 3-button reference.
- If/when line deletion gets built, prefer the confirmed swatch-grows-to-red-X gesture (§5) over inventing a new one.
