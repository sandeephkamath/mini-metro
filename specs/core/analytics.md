# Analytics & Messaging Specification

**Version**: 1.0
**Last updated**: 2026-07-11
**Extends**: `./logic.md`, `./monetization.md`, `./meta_progression.md`

This document defines theme-neutral rules for two purely observational capabilities layered on top of everything else: **Analytics** (logging notable moments in a session for later review) and **Messaging** (registering a player's device so it can be reached by a notification in the future). It contains no concrete event names, parameter names, or provider choices of its own — only the shape of each rule and what a theme/platform must supply.

Both capabilities are strictly one-way and observational. Neither ever gates, delays, changes, or is read back by any gameplay rule in `logic.md`, `progression.md`, `meta_progression.md`, or `monetization.md` — the same relationship the Ad Provider has to the rest of the game (`monetization.md` §6): everything below is purely additive, and its total absence must leave the game exactly as playable as if this document didn't exist.

---

## 1. Analytics (the primitive)

An Analytics Event is a named, timestamped record of something notable that happened in a session, optionally carrying a small number of parameters describing it (e.g. a score, a count, a chosen option). Recording one is fire-and-forget: it never blocks, delays, or can fail visibly to the player — if it can't be recorded, nothing about the session is different.

- Events are recorded at the moment the thing they describe actually happens — not batched, deferred, or reconstructed after the fact.
- An event's parameters describe only what already exists elsewhere in game state at the moment it fires (a score, a count, a chosen kind) — analytics never introduces new state of its own for the game to track.
- Analytics never observes anything about the player's identity beyond what the Leaderboard (`meta_progression.md` §7-8) already establishes when signed in; it does not add any new identity or account concept.

---

## 2. Event Taxonomy

The following moments are significant enough to a session or a player's journey through the game to warrant an Analytics Event. Each is described abstractly — a theme supplies the concrete event/parameter names (§4).

| Event | Fires when | Carries |
|---|---|---|
| Session Started | A session begins (core §1 concept of "a session") | — |
| Session Ended | A session's Final Weeks Survived is read (`meta_progression.md` §1) | Score, Week reached, Final Weeks Survived, whether it raised Best Weeks Survived, session duration |
| Collectible Completed | A Session Contribution completes a Collectible Reward this session (`meta_progression.md` §3-4) | Which Collectible Reward |
| Milestone Bonus Chosen | A player resolves a Milestone Event Choice (core §3) or an ad-gated bonus choice (`monetization.md` §2-3) | Which bonus kind, and whether it came free (Milestone Event) or ad-gated |
| Rewarded Ad Requested | An On-Demand Bonus Request is made (`monetization.md` §2) | Which bonus path it was requested for |
| Rewarded Ad Accepted / Declined / Completed | The player answers or finishes a Rewarded Ad offer (`monetization.md` §1) | Which bonus path the offer belonged to |
| Continue Used | A Game-Over Continue is actually completed, rescuing a Node Overflow in place (`monetization.md` §3) | Continues remaining afterward |
| Leaderboard Sign-In | A player's identity becomes available (`meta_progression.md` §7) | Which identity source |
| Leaderboard Score Submitted | A session's score is submitted (`meta_progression.md` §8) | The submitted value |
| Tutorial Started | A scripted tutorial session begins (`TUTORIAL.md`) | — |
| Tutorial Exited | A scripted tutorial session ends, one way or another | Whether it finished naturally or was skipped |

This table is not exhaustive by design — a theme may log additional events of its own, but everything above is the baseline every theme should cover since each corresponds to a moment already named in `logic.md`, `meta_progression.md`, or `monetization.md`.

---

## 3. Push Notification Token Registration

Separately from Analytics, a theme/platform may register a player's device so that it *could* receive a push notification in the future. This document defines only the registration step:

- Registration is opportunistic and silent — it happens automatically at an appropriate point in the session (a theme decides when), asks the player for permission if the underlying platform requires it, and never blocks or interrupts any gameplay flow either way.
- A declined or failed registration is identical, from the player's perspective, to a platform that never supports push notifications at all (§5 Fail Gracefully) — no retry prompt, no degraded state.
- **Out of scope for this document**: what notifications exist, what they say, what triggers sending one, and how often — none of that is decided yet. Registration only makes a device reachable; nothing in core or any theme currently sends anything to it.

---

## 4. What a Theme/Platform Must Supply

| Parameter | Meaning |
|-----------|---------|
| Analytics Provider | The service that records an Analytics Event (§1-2). May be absent. |
| Messaging Provider | The service that registers a device for future push notifications (§3). May be absent, and may be scoped to a subset of platforms a theme supports. |

---

## 5. Fail Gracefully

If a theme/platform never supplies an Analytics Provider or a Messaging Provider, or either is only sometimes available (e.g. no network), nothing about the game changes for the player: no error states, no blocked flows, no visible difference from a session where every event was recorded successfully. This mirrors the same principle `monetization.md` §6 and `meta_progression.md` §6 already apply to the Ad Provider and to persistence, respectively.
