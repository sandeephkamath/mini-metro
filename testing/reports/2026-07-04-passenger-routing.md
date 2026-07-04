# Test Report — 2026-07-04 — Passenger Routing Focus

Full suite: 8 passed, 1 failed, 1 skipped. Focus of this run was verifying passengers board as soon as a valid route exists and don't wait longer than necessary (core/logic.md §3 Routing).

| ID | Flow | Classification | Symptom | Expected | Repro Steps | Severity |
|----|------|----------------|---------|----------|-------------|----------|
| F1 | Station Overflow / Game Over | Already Tracked — confirmed | Phase stays `playing` after passenger queue is filled past capacity via repeated debug-add | Phase becomes `gameover` once a station's queue exceeds max capacity (core/logic.md §3 Node Overflow) | `testing/flows/overflow-gameover.spec.ts` — debug-add 8 alternating-destination passengers to `circle` (capacity 6) | Blocks play (loss condition unreachable) |
| F2 | Passenger origin-station boarding delay | New Finding | A passenger waiting at the first/origin station of a freshly-drawn line is not boarded on the train's first departure — it must wait for the train to complete a full round trip back to that station before boarding is even attempted | Not specified by `core/logic.md` (silent on train-creation/boarding timing), but observably means a passenger sitting right next to a "moving" train can wait ~8-11s longer than a rider would expect from a game already in progress | `testing/flows/passenger-direct-delivery.spec.ts` — draw circle→triangle, debug-add a passenger at circle destined triangle immediately after; delivery took 11.1s (round trip circle→triangle→circle before boarding is even attempted, then the ride to triangle) | Cosmetic / cosmetic-adjacent (not a spec violation, but a real player-visible "why isn't my passenger moving" moment) |

## Confirmed correct (no findings)

- **Direct delivery** (Routing rule 1): passenger boards and rides straight to destination when it's a future stop on the boarding train's own line. (`passenger-direct-delivery.spec.ts`)
- **One-hop transfer** (Routing rule 3): passenger boards a train that doesn't go to their destination directly, rides to a transfer station, and boards the connecting line correctly. Delivered in 16.2s. (`passenger-transfer-routing.spec.ts`)
- **Anti-bounce** (Routing rule 2): passenger waiting at a transfer station correctly refuses to board a train whose line doesn't serve their destination, holding out for the connecting line instead — delivered in 7.9s rather than shuttling forever on the wrong line, which is what would happen if anti-bounce were broken. (`passenger-transfer-routing.spec.ts`)
- Boot/start/draw-line/debug-mode/weekly-delivery flows all pass as before.

## Notes for whoever picks this up

- F1 is the same root cause already in `specs/memo.md` ("Game over can never trigger") — the fix is in `src/logic/overflow.ts` / the `< maxCapacity` push guards, not anything routing-related.
- F2 is new and not previously documented anywhere. It's arguably out of scope for `core/logic.md` since the spec doesn't define train-creation timing at all — worth a human decision on whether to (a) leave as-is, (b) have `createTrain` start in a `stopped` state so it boards immediately at its spawn station, or (c) just document it as intended. Root cause: `src/logic/trains.ts` `createTrain` sets `state: 'moving'` with the train already positioned at `stationIds[0]`, so `boardPassengers` (only called when a train's `stopTimer` expires while `stopped`) never runs at that station until the train laps back around.
