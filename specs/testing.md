# Testing Agent Specification

**Version**: 1.0
**Last updated**: 2026-07-04

This document defines the behavior and scope of the automated testing agent: what it exercises, how it decides something is a bug, and how it reports findings. It does not define game rules — see `core/logic.md` and `themes/metro.md` for that. It does not define implementation — see `testing/README.md` in the harness folder for how the harness is actually built.

---

## 1. Purpose

An isolated harness and agent that plays the running game, drives it through defined flows and free-form exploration, and reports mismatches between actual behavior and the specs. It exists to catch regressions and spec violations without a human manually clicking through the game.

---

## 2. Isolation Rules

- The testing harness must never modify anything under `src/`. It only observes and drives the game through the same inputs a player (or debug mode) has: mouse clicks/drags on the canvas and key presses on the window.
- The harness lives entirely under `testing/`, as its own package with its own dependencies. It is not a dependency of the game app and must not appear in the root `package.json`.
- The harness may read `specs/` to decide whether a finding is a bug, a known divergence, or already tracked. It must not write to `specs/` — findings are written to `testing/reports/` only. Promoting a finding into `specs/memo.md` or the Bug Log in `themes/metro.md` §9 is a human decision.
- Running the harness must never require changes to game source to add hooks, test IDs, or instrumentation. Debug mode (see `DEBUG.md`) is the only sanctioned instrumentation surface — it already exists for this purpose.

---

## 3. Test Flows

Each flow below is a scenario the harness can run headlessly. "Trigger" is the input sequence; "Expected" is the spec section that defines correct behavior.

| Flow | Trigger | Expected (spec ref) |
|------|---------|---------------------|
| Boot to Start Screen | Load the app | Start screen with instructions and Start button (`themes/metro.md` §7) |
| Start to Playing | Click Start | Phase becomes `playing`; canvas + HUD visible, score 0, week 0 (`themes/metro.md` §7) |
| Draw a Line | Drag from one station to another | A line is created; once a 2nd station is added, a train appears (`core/logic.md` §2 Route, §2 Carrier) |
| Extend a Line | Drag from an end-station of an existing line to a new station | Station is appended/prepended to that line (`core/logic.md` §2 Route, §4) |
| Mid-Line Insertion | Drag from a point along a line's segment to a station not on that line | Station is inserted between the segment's two stations (`core/logic.md` §2 Route, §4) |
| Passenger Direct Delivery | Debug-add a passenger whose destination shape is directly on a train's line | Passenger boards, rides, is dropped at matching-shape station, score +1 (`core/logic.md` §3 Routing/Disembarkation) |
| Passenger One-Hop Transfer | Debug-add a passenger whose destination is only reachable via a connecting line at a transfer station | Passenger transfers at the transfer station and is not skipped (`core/logic.md` §3 Routing rule 3) |
| Anti-Bounce | Debug-add a passenger at a station that already has a direct line to the destination shape | Passenger waits for that line, does not board the current train (`core/logic.md` §3 Routing rule 2) |
| Weekly Upgrade | Advance game time 60s of game time (use debug speed 3x to reach it quickly) | Game pauses, choice popup shows New Train / New Carriage / More Time; picking one adds a Depot item or extends the Risk Timer, toast shown, game unpauses (`themes/metro.md` §4) |
| Line Unlock by Station Count | Debug-spawn stations until the Line unlock step threshold is crossed | Next locked Line unlocks immediately, independent of the Weekly Upgrade timer (`core/progression.md` §4, `themes/metro.md` §3) |
| Station Overflow / Game Over | Debug-add passengers to a station past its max capacity, then advance time past the Risk Timer duration without relieving it | Station enters "at risk" the instant capacity is reached (pulsing glow + countdown arc); phase becomes `gameover` only after the Risk Timer expires while still over capacity (`core/logic.md` §3 Node Overflow) |
| Overflow Recovery | Debug-add passengers to trigger Station at Risk, then relieve the queue below capacity before the Risk Timer expires | Risk Timer is discarded and the Station returns to normal; game does not end (`core/logic.md` §3 Node Overflow) |
| Restart | Click restart on the Game Over screen | Phase returns to `playing` with a fresh game state (score 0, week 0) |
| Debug Mode Toggle | Press `D` | Debug overlay appears/disappears; turning off clears the event log and resets spawn toggles and speed to 1x (`DEBUG.md` Activation, Rules) |
| Spawn Controls | Press `S` / `P` in debug mode | Station/passenger auto-spawn pause independently; timers still advance (`DEBUG.md` Spawn Controls) |
| Speed Controls | Press `0`/`1`/`2`/`3` in debug mode | dt multiplier changes accordingly, capped at 4x (`DEBUG.md` Speed Control) |

---

## 4. Free-Form Exploration

Beyond the fixed flows above, the agent should spend part of each run improvising: combining debug-mode station/passenger injection in unusual orders (e.g. inserting into a line mid-drag while a Weekly Upgrade choice popup is open, forcing two transfer stations to reference each other, rapid restart spamming) to surface edge cases the fixed flows don't cover. Any state that contradicts `core/logic.md` or `themes/metro.md` is a candidate finding.

---

## 5. Finding Classification

Every observed mismatch is classified before being reported:

| Classification | Meaning | Action |
|---|---|---|
| Bug | Actual behavior contradicts `core/logic.md` or `themes/metro.md` | Report with full repro |
| Known Divergence | Matches an entry in `themes/metro.md` §8 | Do not report — this is intentional scope, not a bug |
| Already Tracked | Matches an existing entry in `specs/memo.md` "Bugs" section or the Bug Log in `themes/metro.md` §9 | Do not duplicate; note in the report as "confirmed, already tracked" with a one-line status only |
| New Finding | Doesn't match any of the above | Report with full repro |

---

## 6. Bug Report Format

Each run produces one report file under `testing/reports/`. Each finding is a row:

| Field | Description |
|---|---|
| ID | Short identifier, unique within the report file |
| Flow | Which flow (from §3) or "free-form" produced it |
| Classification | Bug / Already Tracked (per §5 — Known Divergence and non-issues are omitted entirely) |
| Symptom | What was observed |
| Expected | The spec section defining correct behavior |
| Repro Steps | Exact input sequence to reproduce, in order |
| Severity | Blocks play / Incorrect but recoverable / Cosmetic |

---

## 7. Non-Goals

- No performance/load testing (frame rate, memory) — functional correctness only, for now.
- No visual regression testing (pixel diffing of canvas output) — behavior and state only.
- No cross-browser matrix — a single Chromium run is sufficient at this stage.
