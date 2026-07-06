# Original Mini Metro — Gameplay Analysis (Research Notes)

**Purpose**: reference material distilled from watching a full original-Mini-Metro playthrough, for informing future tuning/feature decisions in this project. This is **not a spec** — it describes the original game's behavior, not this game's rules. Cross-check against `core/progression.md`, `core/meta_progression.md`, and `themes/metro.md` before acting on anything here; several things described below are deliberate divergences this project already chose (see §9), not gaps.

**Source**: YouTube video "Mini Metro #1 ►London 2000+ Strategy and Tips◀" (Skye Storme, uploaded 2015-11-12, 35:10 runtime). London map, played to a final score of 2157 passengers delivered over 71 in-game days before a station-overflow Game Over.

**Method & caveats**: no captions/transcript exist for this video (silent gameplay + background music only). Analyzed by downloading the video (`yt-dlp`, format 18/360p) and sampling frames at regular intervals (every 20s across the full runtime, plus finer full-resolution sampling around every Weekly Upgrade popup and the ending). Real video seconds do **not** map linearly to in-game days — the player fast-forwards through slow stretches — so treat all "day"/"week" numbers below (read directly from on-screen UI) as reliable, and treat "this took N video-seconds" as informative but not a real-time pacing measurement.

---

## 1. Run Summary

| Stat | Value |
|---|---|
| Map | London |
| Final score (passengers delivered) | 2,157 |
| Days survived | 71 |
| Cause of death | "Overcrowding at this station has forced your metro to close" — single-station overflow, not a network-wide collapse |
| Lines used at death | 7 of 7 (all line colors unlocked: yellow, red, navy, cyan, green, pink, + one more) |
| Post-game options | Restart / **Continue in Endless** / Menu |

The "Continue in Endless" option confirms the original game has a distinct Endless mode reachable directly from a Game Over screen — worth knowing as a concept even though this project has no mode split yet.

---

## 2. Station (Node) Growth & Shape Variety

Station shapes observed, in order of appearance through the run: **circle, triangle, square** (present from the very start) → **diamond, plus/cross, star** appear progressively in the back half of the run (roughly the last third of the 71 days). That's at least 6 distinct shapes in a single run, possibly a 7th not captured in the sampled frames.

This directly matches work already done in this project (`git log`: "Add new station shapes with weekly unlock schedule") — the original's approach of introducing new station types on a time schedule rather than all at once is confirmed as the real pattern, not a guess. Note `themes/metro.md` §10's divergence table still lists "Station shapes: 7+ (original) vs 3 (this version)" — that row looks stale given the shape-unlock work already landed; worth a quick pass to confirm/update it.

Station count by the crisis point (~day 65-70) was roughly 25-30 simultaneously on screen — a dense, sprawling network, not a small handful. Growth felt continuous throughout, not front-loaded.

---

## 3. Passenger (Resource) Pacing

Confirmed checkpoints read directly off the HUD (passengers delivered / day-of-week):

| Day (approx.) | Passengers delivered |
|---|---|
| 2 | 1 |
| 4 | 10 |
| 6 | 24 |
| 8 (Week 2 starts) | 38 |
| ~57 | ~1,700 |
| 65-70 | ~2,068 (score visibly *stalls* here across several samples while multiple stations sit in overflow-risk simultaneously — the crisis is a multi-station pileup, not one isolated failure) |
| 71 | 2,157 (final) |

Shape of the curve: slow trickle for the first week (needs the player to have *any* line drawn at all before anything moves), then a steadily accelerating climb as more lines/stations/carriers compound — consistent with this project's existing `progression.md` §2 growth-curve design (shrinking tick interval + growing batch fraction, both bounded). Nothing observed contradicts that model; if anything it validates the "compounding, bounded-growth" shape over a "flat linear" one.

The endgame pattern — score plateaus while several stations independently enter overflow risk around the same time, then one crosses its grace window and the whole network shuts down — is a good real-world validation of this project's Grace Timer / Overflow Risk design (`core/logic.md` §3 Node Overflow, `progression.md` §5): the original clearly has an equivalent per-station grace/warning state (see §6 below), and death arrives as "one straw breaks a network already under multi-point stress," not a single freak overflow.

---

## 4. Line (Route) Unlock Pacing

- Starts with 1 line available; a 2nd unlocks quickly (by day 6).
- By the crisis point, **6 of 7** total line colors are active; the 7th appears to be the last one still locked (gray dot in the reserve UI).
- **7 total line colors** is the observed cap for the London map — matches general Mini Metro knowledge, good to have visually confirmed.
- Line unlocks in the original are tied to the **Weekly Upgrade** choice (see §6) — i.e., timer-driven (once a week, contingent on the player picking "Line" over the alternative offered that week), not station-count-driven.

This is a **known, deliberate divergence** already documented in `memo.md` ("Line unlocks driven by Station count instead of the Weekly Upgrade timer" — `progression.md` §4) and it's a good one to keep: tying unlocks to map growth rather than a shared timer slot avoids the original's failure mode where picking "Line" crowds out Train/Carriage/Grace-equivalent picks in the same week. No action needed here beyond awareness — just don't mistake the original's coupling for something missing from this project's design.

---

## 5. Weekly Upgrade System — Detailed Observations

This is the part with the most actionable new detail. Every 7 days (confirmed: Week 2 popup at day 8, Week 3 at day 15, Week 7 at day 43, Week 9 at day 57 — all consistent with `7 × (week−1) + 1`), the game pauses and presents a reward. Popups actually observed:

| Week | Options offered | Notes |
|---|---|---|
| 2 (day 8) | Line **/** Tunnels (badge: "2") | |
| 3 (day 15) | Line **/** Tunnels (badge: "2") | |
| 4 (day 22) | **No choice** — "You have a new locomotive for your metro" | Single auto-granted Train, informational only, no second option shown |
| 6 (day 36) | Line **/** Carriage | |
| 7 (day 43) | Line **/** Interchange | |
| 9 (day 57) | Line **/** Carriage | |

Observations:

- **The reward pool has (at least) 5 kinds**: Line, Train (shown as "Locomotive"), Carriage, Tunnels, Interchange. Every popup that *was* a choice offered exactly 2 of these.
- **Most weeks are a binary choice; at least one (week 4) was a single forced auto-grant with no choice UI at all.** I couldn't determine the rule that decides choice-vs-auto from this one playthrough — possibilities include "auto-grant happens when there's nothing meaningful left to choose between" or a fixed early-game script (e.g. always auto-grant a Train in an early week to guarantee the player isn't stuck with 1 vehicle). Worth treating as an open question rather than a confirmed rule if this ever gets emulated.
- **Rewards are stockpiled, not auto-applied.** A row of small icons in the bottom-left HUD (train / carriage / tunnel / interchange, each with a count badge) accumulates unused rewards, and the player manually drags them onto the map whenever they want. This is an exact match for this project's already-specced `Reserve` concept (`core/logic.md` §2 Reserve, §3 Milestone Events) — good independent confirmation that "accumulate in reserve, assign whenever, no expiry" is the right mental model, not something to second-guess.
- **The game auto-pauses for the choice popup**, resuming only once the player picks — also already matched by this project's spec ("Choice mode... pauses game time," `core/logic.md` §3 Milestone Events). Confirmed real, not an assumption.
- **Tunnels are granted in batches of 2**, per the "2" badge on that reward icon both times it appeared — i.e. it's not "+1 tunnel," it's a fixed lump grant, same shape as this project's "Reserve Carriage capacity bonus" being a fixed increment rather than variable.

Since this project has no river/tunnel/interchange mechanic and deliberately does 3 bonus kinds instead of 5 (`progression.md` §6: Reserve Carrier / Reserve Carriage / Grace Duration increase), the natural mapping is: Train → Reserve Carrier, Carriage → Reserve Carriage, and this project's Grace-Duration-increase is a reasonable original invention filling the role Interchange/Tunnel play in the original (a way to buy slack without adding a vehicle). No gap here — just a useful equivalence table if it's ever useful to explain the design lineage.

---

## 6. Overflow Warning (visual, in the original)

Stations approaching or in an overflow state show a **gray circular badge over the station, resembling a countdown/pie-timer**, visible simultaneously at multiple stations in the crisis leading up to Game Over. This is functionally the original's version of an Overflow Risk / Grace Timer indicator — strong independent confirmation that this project's own Grace Timer redesign (replacing instant-overflow Game Over, `core/logic.md` §3, fixed bug B8 per `metro.md` §11) is the right shape of mechanic, not a deviation from how the original actually feels. The original doesn't appear to have a plain pulsing-red-ring-only warning (the gap noted in `memo.md`'s Styling section is a real opportunity: a distinguishable pre-overflow countdown badge, not just a color pulse, seems to be what makes the original's multi-station crisis moments readable).

---

## 7. Route Drawing, Editing, and Deletion

Drawing behavior matches this project's existing spec almost exactly: drag from a station to start/extend a line, drag onto an existing line's end-tab to extend that specific line, stations with multiple lines just have multiple independent end-tabs. Branching (a single line splitting into two paths) was **not** observed anywhere in the run — confirms this project's existing "branching is not allowed" rule is correct to the original, not an arbitrary restriction. (The "T"/"+"/star shapes seen on stations are **station types**, not line branches — easy to misread as a branch in a low-res frame, worth flagging since I initially misread it that way myself before checking closer.)

**Editing/deletion, observed indirectly**: around day 32 (network briefly shown fragmenting into disconnected stations, then fully redrawn over the next few samples) and again near day ~48 (a line's shape visibly changes — a detour/loop it had is gone in the next sample), the player clearly deleted and reworked existing lines rather than only ever extending them. Both edits happened **while the game was paused** (pause icon visible in the HUD) — using the pause button to plan a reroute without time pressure is a clearly deliberate, repeated player strategy, not a one-off.

I was not able to directly capture the exact input gesture for deletion frame-by-frame (it happens faster than the 20s sampling interval), so treat the *mechanism* below as general knowledge rather than something this analysis directly observed: the original lets you (a) shorten a line by dragging its end-tab backward along its own path, detaching trailing stations one at a time, and (b) delete a line entirely by pressing/dragging its color swatch in the bottom-bar legend off the map. What I *did* directly observe and can vouch for: the **result** — lines do get shortened, rerouted, and removed mid-session, and pausing first is a real, common technique.

This matters because `themes/metro.md` §10 lists "Line deletion: Yes (original) / No (current)" as a known divergence, and `core/logic.md` §4 currently says "releasing anywhere other than a valid Node cancels the drag" — i.e. there's genuinely no shorten/delete path today. If/when that gets built, the two gestures above (drag-endpoint-backward-to-shorten, drag-swatch-off-to-delete-whole-line) are the concrete UX to emulate, and a **pause-to-edit** affordance seems to be how skilled players actually use it, which might matter more than the gesture details themselves.

---

## 8. Interchange / Tunnel Notes

Interchange stations render as an enlarged station with a ring/hub look where many lines converge — a visual "this station got upgraded" cue distinct from a plain multi-line transfer station. Tunnels render as a dashed line segment where a route crosses water. Neither is relevant to this project today (no river/obstacle mechanic — `memo.md` explicitly defers this), so this is filed for later, not actionable now.

---

## 9. Cross-Reference: What's Already Known vs. What's New Here

Already documented as intentional divergences (`memo.md`, `metro.md` §10) — this analysis doesn't change these, just confirms the original's actual behavior for contrast:
- Line unlocks: timer+choice (original) vs. Node-count-driven (this project, deliberate).
- Bonus kinds: 5 (original) vs. 3 (this project, deliberate — no river/tunnel/interchange mechanic).
- Line deletion: present (original) vs. absent (this project, open gap, not yet built).

New/reinforcing information from this analysis, worth acting on:
1. **Overflow warning should probably be a countdown-style badge, not just a red pulse** — the original's readability during multi-station crises seems to lean on this (ties into `memo.md` Styling section).
2. **Station shape unlock schedule already matches the original's real pattern** — no change needed, just confirms recent work (`f8d75c5`) is on the right track; consider updating the stale "3 shapes" row in `metro.md` §10.
3. **If line deletion/shortening ever gets built**, use drag-endpoint-backward (shorten) and drag-swatch-off-map (delete whole line) as the reference gestures, and consider surfacing "pause to edit" as a player-facing affordance rather than debug-only (this ties into the existing FTUE backlog in `memo.md`, which already flags that pause is debug-only today).
4. **Reserve/stockpile UI (small badge-counted icons for unused rewards) is a good direct visual reference** for implementing this project's own not-yet-built Reserve UI (`core/logic.md` §2 Reserve is specced but per `memo.md` §"Carriers / Trains / Line Unlocks / Overflow Grace," not yet implemented in code).
5. **Endless mode as a distinct post-Game-Over path** is a concept this project doesn't have at all — not urgent, but worth a `memo.md` line if there's ever appetite for a longer-session mode beyond "restart from zero."

---

## 10. Suggested Follow-ups (not yet actioned)

- Add a `memo.md` note under Styling about the countdown-badge overflow cue (item 1 above).
- Quick fact-check pass on `metro.md` §10's divergence table (station shape count looks stale).
- If line deletion becomes a priority, revisit this doc's §7 before designing the gesture.
