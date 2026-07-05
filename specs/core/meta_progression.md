# Meta-Progression Specification

**Version**: 1.0
**Last updated**: 2026-07-05
**Extends**: `./logic.md`

This document defines theme-neutral rules for progress that persists *across* sessions — distinct from `progression.md`, which governs difficulty pacing *within* a single session. It contains no concrete numbers of its own and no rendering/UI references — only the shape of each rule and the parameters a theme must supply.

Use this document when reasoning about long-term player progress: what carries over between games, and how a session's outcome feeds into it.

---

## 1. Level

A Level is the theme-neutral term for a session's count of completed Milestone Events (core §3).

- Level 0 is the state before the first Milestone Event fires in a session.
- Level N is reached the instant the Nth Milestone Event completes.
- Level is not a separate counter — it is always exactly equal to the number of Milestone Events that have fired so far in the current session.
- A session's **Final Level** is the Level value at the moment the session ends (via Node Overflow, core §3).

---

## 2. Best Level Reached

A single value, retained across sessions.

- At the end of every session, if that session's Final Level exceeds the stored Best Level Reached, the stored value updates to the new Final Level.
- Best Level Reached only ever increases — a worse session never lowers it.

---

## 3. Collectible Reward Progression

The game maintains an ordered, unbounded sequence of Collectible Rewards, indexed 1, 2, 3, ...

- Each Collectible Reward has a **Required Progress** threshold. The threshold grows from one Collectible Reward to the next following a fixed curve, in the same style as the decay curves in `progression.md` §2 — except growing rather than shrinking:

  `required(N) = base × growthRate ^ (N - 1)`, with growthRate > 1.

- At any time, exactly one Collectible Reward is **current** — the next one in the sequence not yet completed. Progress accumulates only toward the current Collectible Reward.
- At the end of *every* session, that session's Final Level is added to the current Collectible Reward's **Accumulated Progress** — regardless of whether it matches or is lower than any previous session's Final Level. This addition happens unconditionally: no minimum Level is required to contribute, and a session need not beat any prior result to count.
- When Accumulated Progress meets or exceeds the current Collectible Reward's Required Progress, that Collectible Reward is marked **Complete** and is added to a permanent **Collection**. Any surplus (Accumulated Progress beyond the Required Progress) carries forward as the starting Accumulated Progress on the next Collectible Reward in the sequence, which becomes the new current one.
- The Collection only ever grows — a Complete Collectible Reward is never removed or reset.
- The sequence has no end — a theme's growth curve determines how much harder later Collectible Rewards are to complete, not whether they exist.

---

## 4. What a Theme Must Supply

| Parameter | Meaning |
|-----------|---------|
| Collectible Reward base requirement | Required Progress for the first Collectible Reward (N = 1) |
| Collectible Reward growth rate | Multiplier applied to the requirement for each subsequent Collectible Reward |
| Collectible Reward presentation | What a Collectible Reward concretely is, and how partial progress within it is depicted |

---

## 5. Relationship to Session Difficulty

Level and Collectible Reward progress are purely observational — they read the outcome of a session (its Final Level) and never feed back into `progression.md`'s difficulty curve. Every session starts at Level 0 under the same rules regardless of Best Level Reached or Collection size. Meta-progression rewards persistence and improvement without ever letting a player skip or soften the in-session difficulty ramp.
