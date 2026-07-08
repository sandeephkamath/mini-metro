# Meta-Progression Specification

**Version**: 2.3
**Last updated**: 2026-07-08
**Extends**: `./logic.md`

This document defines theme-neutral rules for progress that persists *across* sessions — distinct from `progression.md`, which governs difficulty pacing *within* a single session. It contains no concrete numbers of its own and no rendering/UI references — only the shape of each rule and the parameters a theme must supply.

Use this document when reasoning about long-term player progress: what carries over between games, and how a session's outcome feeds into it.

---

## 1. Weeks Survived

Weeks Survived is the theme-neutral measure of how long a session lasted: the current week number (`progression.md` — the same clock that drives every difficulty curve), continuously combining whole weeks elapsed and fractional progress through the current week.

- Weeks Survived starts at 0 at session start and increases continuously with the Game Clock (core §6) — it is not a separate counter and does not depend on Milestone Events firing.
- A session's **Final Weeks Survived** is this value at the moment the session ends (via Node Overflow, core §3).
- Milestone Events (core §3) still fire on their own schedule and still grant their bonuses — Weeks Survived and Milestone Events are independent systems layered on the same Game Clock, the same way Route unlocking and Node spawning are independent systems layered on Node count (`progression.md` §4).

---

## 2. Best Weeks Survived

A single value, retained across sessions.

- At the end of every session, if that session's Final Weeks Survived exceeds the stored Best Weeks Survived, the stored value updates to the new Final Weeks Survived.
- Best Weeks Survived only ever increases — a worse session never lowers it.

---

## 3. Collectible Reward Progression

The game maintains an ordered, unbounded sequence of Collectible Rewards, indexed 1, 2, 3, ...

- Each Collectible Reward has a **Required Progress** threshold. By default the threshold grows from one Collectible Reward to the next following a fixed curve, in the same style as the decay curves in `progression.md` §2 — except growing rather than shrinking:

  `required(N) = base × growthRate ^ (N - 1)`, with growthRate > 1.

  A theme/platform may instead assign an explicit Required Progress to specific Collectible Rewards individually rather than deriving every one from the formula — the formula is the default shape content follows when nothing more specific is given, not a constraint the game enforces.
- **Stability once reachable**: whatever supplies a Collectible Reward's Required Progress and content (§4) — fixed constants or a dynamically updated source — must not change either for an index once any session has any Accumulated Progress toward it. Changing them retroactively would invalidate progress a player already earned. New Collectible Rewards may always be added further out in the sequence; existing, already-reachable ones must not be edited in place.
- Each Collectible Reward is also divided into a fixed number of equal **Reveal Steps** — a theme-supplied granularity (e.g. a Picture's tile grid). A Reveal Step's progress cost is `required(N) / Reveal Step count`. A theme's presentation may use this same division to decide when to visibly reveal something (see `themes/metro.md` §9.3), and it also drives the Minimum Session Contribution guarantee below.
- At any time, exactly one Collectible Reward is **current** — the next one in the sequence not yet completed. Progress accumulates only toward the current Collectible Reward.
- At the end of *every* session, that session's Final Weeks Survived is added to the current Collectible Reward's **Accumulated Progress** — regardless of whether it matches or is lower than any previous session's Final Weeks Survived, and regardless of whether Final Weeks Survived is 0. This addition happens unconditionally: no minimum Weeks Survived is required to contribute, and a session need not beat any prior result to count.
- **Minimum Session Contribution**: if a session's Final Weeks Survived would add less than one Reveal Step's worth of progress, the contribution is raised to exactly one Reveal Step instead. Every completed session — even one that ends at 0 Weeks Survived — therefore visibly advances the current Collectible Reward by at least one Reveal Step. A session whose Final Weeks Survived already exceeds one Reveal Step's worth of progress is unaffected by this floor; better play still contributes proportionally more.
- When Accumulated Progress meets or exceeds the current Collectible Reward's Required Progress, that Collectible Reward is marked **Complete** and is added to a permanent **Collection**. Any surplus (Accumulated Progress beyond the Required Progress) carries forward as the starting Accumulated Progress on the next Collectible Reward in the sequence, which becomes the new current one — including any further Reveal Steps or completions that surplus alone triggers.
- The Collection only ever grows — a Complete Collectible Reward is never removed or reset.
- The sequence has no end — a theme's growth curve determines how much harder later Collectible Rewards are to complete, not whether they exist.

---

## 4. What a Theme Must Supply

These may be fixed constants baked into the game, or sourced dynamically at runtime (e.g. from a remote content source) — core does not prescribe how a theme obtains them, only that it supplies them consistently and honors the stability rule above once a value has been used.

| Parameter | Meaning |
|-----------|---------|
| Collectible Reward base requirement | Required Progress for the first Collectible Reward (N = 1) |
| Collectible Reward growth rate | Multiplier applied to the requirement for each subsequent Collectible Reward |
| Collectible Reward presentation | What a Collectible Reward concretely is, and how partial progress within it is depicted |
| Collectible Reward reveal granularity | Number of equal Reveal Steps a theme divides each Collectible Reward into (e.g. a Picture's tile count) |

---

## 5. Relationship to Session Difficulty

Weeks Survived and Collectible Reward progress are purely observational — they read the outcome of a session (its Final Weeks Survived) and never feed back into `progression.md`'s difficulty curve. Every session starts at 0 Weeks Survived under the same rules regardless of Best Weeks Survived or Collection size. Meta-progression rewards persistence and improvement without ever letting a player skip or soften the in-session difficulty ramp.

---

## 6. Persistence

Meta-progression is the only game state that survives beyond a single session — everything else (core §1–§5, `progression.md`) resets fully on restart.

- **What persists**: Best Weeks Survived (§2), the Collection (§3 — which Collectible Rewards are Complete), and the current Collectible Reward's Accumulated Progress (§3). Nothing else — in-session state (Weeks Survived so far, Node/Resource layout, Route/Carrier unlocks, score) never persists.
- **When it's read**: once, when the game first loads, before the home screen is shown. If no persisted data exists (first-ever visit, or storage was cleared or unavailable), meta-progression starts from its zero state: Best Weeks Survived 0, Collectible Reward 1 current with 0 Accumulated Progress, empty Collection.
- **When it's written**: once, at the end of each session, immediately after Best Weeks Survived and Collectible Reward progress (§2, §3) are updated for that session's Final Weeks Survived. A session abandoned mid-play (e.g. the tab is closed before Node Overflow ends it) never reaches this point, so it never persists a Final Weeks Survived for that unfinished attempt.
- **Failure is silent**: if persisted data cannot be read or written (storage disabled, quota exceeded, corrupted data), the game falls back to the zero state for that load/session rather than blocking play or surfacing an error to the player — meta-progression is a bonus layer, never a requirement to play.

---

## 7. Leaderboard

In addition to Best Weeks Survived (§2), which is always a local, single-device value, a platform may optionally offer a **Leaderboard**: a global ranking of Best Weeks Survived across all players who have one.

- The Leaderboard ranks players by the same value as Best Weeks Survived (§2) — not a separate metric.
- At the end of every session, if a Leaderboard is available, that session's Final Weeks Survived is submitted to it, the same moment Best Weeks Survived (§2) is evaluated locally. The Leaderboard backend, not this game, is responsible for keeping only each player's best submission — this game does not need to compare against a previous value before submitting.
- A Leaderboard shows, at minimum, a ranked list of the top-standing players and the current player's own rank, even when that rank falls outside the visible list.
- The Leaderboard is surfaced in two places: passively, right after a session ends (the player's rank alongside the existing Best Weeks Survived and Picture reveal, §3); and on demand, from the home phase, viewable at any time independent of whether a session just ended.
- Leaderboard rank is not a persisted local value (§6 does not cover it) — it is read fresh from the Leaderboard backend whenever shown, since it depends on every other player's standing, not just this player's own history.
- **Availability is platform-defined and may not exist at all.** A Leaderboard requires an identity mechanism and a backend that only a platform can supply (§8) — where neither exists, Best Weeks Survived (§2) still works as a fully local value on its own, and the Leaderboard simply does not appear anywhere. No core gameplay or local meta-progression rule depends on the Leaderboard being present.

---

## 8. What a Platform Must Supply for the Leaderboard

A Leaderboard is optional, and is layered on top of everything above rather than being required by it — a theme/platform that skips this section still has a fully working Best Weeks Survived (§2) and Collectible Reward (§3) system.

The backend and the identity source need not be the same service — a platform may source a player's identity from one system (e.g. a games-identity provider) while storing and ranking scores in an entirely different one (e.g. a generic backend-as-a-service), so long as a submitted score can still be attributed to that identity.

| Parameter | Meaning |
|-----------|---------|
| Leaderboard backend | The service that stores and ranks submitted scores across all players |
| Player identity source | How a submitted score is attributed to a specific player |
| Availability condition | The runtime condition under which the Leaderboard is offered at all — a platform may support it only in some contexts (e.g. one packaging target but not another) |
| Sign-in behavior | Whether/how a player is authenticated before a score can be submitted or a rank viewed |
| Top N count | How many top-ranked players are shown in the ranked list before falling back to just the player's own rank |
