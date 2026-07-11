# Monetization Specification

**Version**: 1.0
**Last updated**: 2026-07-08
**Extends**: `./logic.md`, `./progression.md`

This document defines theme-neutral rules for ad-gated monetization: optional ways for a player to get the same rewards a Milestone Event grants (core §3), faster or after a run would otherwise have ended, in exchange for watching a Rewarded Ad. It contains no concrete numbers of its own and no rendering/UI references — only the shape of each rule and the parameters a theme/platform must supply.

Monetization is a layer on top of everything in `logic.md` and `progression.md`, never a replacement for it. A Milestone Event's bonus stays free and unconditional exactly as `progression.md` §6 describes; everything below is an *additional*, optional path to the same two bonus kinds.

---

## 1. Rewarded Ad (the primitive)

A Rewarded Ad offer is a yes/no prompt the player can accept to watch an ad in exchange for a reward. Two sections below (§2, §3) each define what triggers the offer and what the reward is; both share this same primitive.

- Presenting the offer pauses the Game Clock via the same mechanism as a Milestone Event Choice (core §3 Milestone Events, core §6 Game Clock) — every timer in the game freezes until the player answers, and if they accept, until the ad itself finishes.
- **Declined**: the player says no. No reward is granted. The Game Clock resumes and whatever moment triggered the offer (§2, §3) is left exactly as if the offer had never been made.
- **Completed**: the player watches the ad through to the end. The reward defined by whichever section triggered the offer (§2 or §3) is granted immediately after.
- **Failed / unavailable**: the Ad Provider (§4) cannot currently serve an ad. This is not something the player can trigger and then have fail — the offer is only ever presented when an ad is available (§4), so from the player's perspective "no ad available" simply means the on-demand request and the Game-Over Continue don't appear as options at all, rather than appearing and then failing.
- A Rewarded Ad never touches Milestone Events (core §3) directly — those bonuses are always free and unconditional (`progression.md` §6). The two systems below are separate, additional paths to the same two bonus kinds, not a gate placed in front of the existing one.

---

## 2. On-Demand Bonus Request

At any point during a session (while the game is in progress, not paused by another modal), the player may request an extra Reserve bonus without waiting for the next Milestone Event.

- Requesting it presents a Rewarded Ad offer (§1).
- **On completion**, the player picks exactly one of the two Milestone Event bonus kinds (core §3 Milestone Events) — a Reserve Carrier or a Reserve Carriage — using the same choice presentation as a Milestone Event Choice. The chosen kind is added to the Reserve (core §2) exactly as a Milestone Event bonus would be.
- **On decline or unavailability**, nothing changes — no bonus, no other side effect.
- **Unlimited**: there is no cap on how many times a session may use this path. Its purpose is to let a player who wants to progress faster do so at any time, at the cost of watching an ad each time — capping it would undercut that purpose.
- **Independent of Milestone Events**: requesting or completing this never changes the Milestone Event interval, its own countdown, or (in Auto mode) which kind is next in the round-robin — the two systems run on separate clocks and never read or write each other's state.

---

## 3. Game-Over Continue

Node Overflow (core §3) ends the game only when no Game-Over Continue is available for that expiry — either the Ad Provider currently has nothing to serve (§4), or this session has already used up its Continue Limit (§5).

- When a Node's Grace Timer expires while a Continue *is* available, the game does not end yet: in place of ending immediately (core §3 Node Overflow, "Expiry"), a Rewarded Ad offer (§1) for a continue is presented instead of the game-over screen.
- **Declined or failed**: the game ends exactly as core §3 already describes — no different from a session with no Continue available at all.
- **Completed**: the player picks one of the two bonus kinds (§2) and it is added to the Reserve. Then, every Node currently in Overflow Risk is given a genuine reprieve, not merely nudged back across the line that caused it: its queue of waiting Resources is cut back to a safe fraction of its capacity (well below either overflow trigger — over-capacity or an overstaying Resource, core §3 Node Overflow), discarding the excess Resources rather than holding or redistributing them — the same "excess is discarded, not returned" rule core §2 Route already uses when a Route is deleted. Every Resource still waiting there afterward also has its own wait clock reset, so a Resource that was seconds from breaching the Passenger Patience Limit doesn't simply re-trigger the same Grace Timer it just escaped. The Node's Grace Timer itself is discarded. This is a one-time rescue, not the same thing as a normal Recovery (core §3 Node Overflow) — a normal Recovery only requires dropping back under the trigger threshold, whereas a Continue is deliberately more generous since the player is spending a limited resource (§5) to buy real time, not just a technicality. The session then resumes from exactly where it left off: same score, same map, same Weeks Survived so far, with the newly-chosen Reserve item ready to place.
- Accepting and completing a continue this way consumes one from the session's remaining Continue count (§5); declining or a failed ad does not consume one, since no continue actually happened.
- A session's Final Weeks Survived (`meta_progression.md` §1) is read only at the moment the game *actually* ends. A Node Overflow rescued by a completed Continue never counts as that moment — nothing is recorded against meta-progression for an overflow that was undone this way.

---

## 4. What a Theme/Platform Must Supply

An Ad Provider is the service that actually serves a Rewarded Ad and reports whether it was watched to completion. Core does not prescribe how a theme obtains one — it may be a real ad SDK, or, before one is integrated, a theme-supplied stand-in that always (or conditionally) reports success, so the rest of this spec can be built and tested independent of any real ad integration.

| Parameter | Meaning |
|-----------|---------|
| Ad Provider | The service that serves a Rewarded Ad and reports completion/failure |
| Availability condition | The runtime condition under which the Ad Provider is currently able to serve an ad at all (may be unconditionally true, or depend on network, region, platform SDK init, or a development stand-in's own rules) |

---

## 5. Configuration Values (theme supplies)

| Parameter | Meaning |
|-----------|---------|
| Continue Limit (per session) | How many times Game-Over Continue (§3) can be completed in a single session before Node Overflow ends the game unconditionally |
| Continue Relief Fraction | The fraction of a Node's capacity its queue is cut back to when a Game-Over Continue completes (§3) — deliberately well under 100%, so the relief is a real reprieve rather than a value that immediately re-trips the same trigger |

- Continue Limit resets to its full count at the start of every session — it is in-session state, the same category as everything in `progression.md`, not meta-progression (`meta_progression.md`), and it is never persisted across sessions.
- The On-Demand Bonus Request (§2) has no equivalent limit parameter — it is deliberately uncapped (§2).

---

## 6. Fail Gracefully

If a theme/platform never supplies an Ad Provider, or it is simply never available for the whole session, both the On-Demand Bonus Request (§2) and Game-Over Continue (§3) never appear as options anywhere — not shown disabled, not shown with an error, just absent. The game remains fully playable exactly as it was before this document existed: Milestone Events keep granting their free bonus, and Node Overflow ends the game unconditionally on Grace Timer expiry. This mirrors the same "fail silent, degrade gracefully" principle `meta_progression.md` §6 already applies to persistence.

---

## 7. Relationship to Session Difficulty and Meta-Progression

- Neither the On-Demand Bonus Request nor Game-Over Continue changes any rule in `progression.md` — they grant exactly the same two bonus kinds a Milestone Event already can, through an additional, optional, ad-gated path, not a new kind of reward or a change to the difficulty curve.
- Game-Over Continue does not change what Final Weeks Survived measures or how it feeds `meta_progression.md` §3's Collectible Reward progress or §7's Leaderboard — it only changes *when* a session's ending moment is reached, by letting the player rescue what would otherwise have been that moment. Once a session ends for real (no Continue available, or the player declines), meta-progression proceeds exactly as `meta_progression.md` already specifies.
