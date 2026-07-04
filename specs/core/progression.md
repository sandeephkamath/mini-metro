# Progression & Difficulty Specification

**Version**: 1.0
**Last updated**: 2026-07-05
**Extends**: `./logic.md`

This document defines the theme-neutral rules that govern pacing and difficulty: how often Nodes and Resources spawn, how that rate changes over time, and how Route/Carrier unlocks progress. It is the tuning layer that sits between the fixed mechanics in `logic.md` and each theme's concrete numbers (e.g. `themes/metro.md` §5 Configuration Values). It contains no concrete numbers of its own and no rendering/UI references — only the shape of each rule and the parameters a theme must supply.

Use this document when you want to reason about or change the game's difficulty curve without touching core mechanics.

---

## 1. Node Spawn Rate

New Nodes appear on a fixed timer, at a random valid position, until a maximum count is reached.

- A position is valid if it is at least the minimum spacing away from every existing Node and at least the edge margin away from the map bounds.
- New Node types are distributed to keep type counts roughly balanced (see core §2 Node).

| Parameter | Meaning |
|-----------|---------|
| Node spawn interval | Time between Node spawn attempts |
| Node min spacing | Minimum allowed distance between any two Nodes |
| Node edge margin | Minimum allowed distance between a Node and the map edge |
| Max Node count | Spawning stops once this many Nodes exist |

---

## 2. Resource Spawn Rate

Each Node independently spawns Resources on a repeating timer. The interval shrinks over time following a decay curve, bounded below by a floor so it never reaches zero.

Shape: `interval(week) = max(floor, base × decayRate ^ week)`

| Parameter | Meaning |
|-----------|---------|
| Resource spawn base interval | Interval at week 0 |
| Resource spawn decay rate | Multiplier applied to the interval once per week (< 1 shortens it) |
| Resource spawn floor | Minimum interval the decay curve will not cross |

If a Node has no valid destination type anywhere on the map, its spawn attempt is skipped (see core §2 Resource) rather than deferred or queued.

---

## 3. Effective Waiting Budget (derived, not a separate mechanic)

There is no explicit "max wait timer" on a Resource or a Node — Node Overflow (core §3) already ends the game once a Node's queue exceeds its capacity. The amount of time a Resource can realistically wait before its Node risks overflow is a *derived* quantity, not a rule of its own:

```
effective wait budget ≈ Node capacity ÷ (Resource arrival rate at that Node − relief rate from Carriers serving it)
```

This section exists so difficulty can be reasoned about in terms of "how long can a Resource wait before things get dangerous," by adjusting the upstream parameters below rather than adding a new failure condition:

- Raising Node capacity, slowing Resource spawn rate, or shortening the Delivery Event interval (more Carriers sooner) all increase tolerable wait.
- Lowering Node capacity, speeding up Resource spawn decay, or leaving a Node poorly served all decrease it.

---

## 4. Route / Carrier Unlock Progression

A fixed number of Routes are unlocked at game start (core §2 Route). Additional Routes, Carriers, and Carrier capacity unlock via Delivery Events, which fire on a fixed interval — one "week" of game time (core §3 Delivery Events).

The unlock order is a schedule: an ordered list mapping week index → what unlocks. A theme may use the simple default described in core §3 (one Carrier to the least-served Route, one Route unlock if any remain, one capacity bump to the busiest Carrier — every event, round-robin), or supply an explicit week-indexed table for finer control over pacing (e.g. front-loading Route unlocks, or holding capacity bumps until later weeks).

| Parameter | Meaning |
|-----------|---------|
| Initial unlocked Route count | Routes available at game start |
| Total Route count | Routes available across the whole session |
| Delivery Event interval | Duration of one "week"; how often the unlock schedule advances |
| Unlock schedule | Week-indexed mapping of what a given Delivery Event grants, if overriding the round-robin default |

---

## 5. Difficulty Levers Reference

All parameters named above, in one place. A theme fills these in as concrete values (e.g. `themes/metro.md` §5 Configuration Values) or preset tables for different difficulty modes.

| Lever | Governs |
|-------|---------|
| Node spawn interval | How fast new Nodes appear |
| Node min spacing | Map density |
| Node edge margin | Playable map area |
| Max Node count | Session length ceiling before Node spawning stops |
| Resource spawn base interval | Starting Resource pressure per Node |
| Resource spawn decay rate | How quickly Resource pressure ramps up |
| Resource spawn floor | Maximum Resource pressure at late game |
| Initial unlocked Route count | Starting player capability |
| Total Route count | Ceiling on player capability |
| Delivery Event interval | How often the player gets relief (Carriers, Routes, capacity) |
| Unlock schedule | Which relief arrives on which week, if not round-robin |
| Node capacity | Ceiling before a single under-served Node ends the game |
| Carrier capacity | How much relief one Carrier provides per stop |

---

## 6. Tuning Guidance

- **Easier**: increase Node capacity, increase Resource spawn base interval/floor or slow the decay rate, increase initial unlocked Routes or Carrier capacity, shorten the Delivery Event interval.
- **Harder**: the inverse of the above — lower Node capacity, faster Resource spawn decay, fewer starting Routes, longer Delivery Event interval.
- Changing any single lever shifts the effective waiting budget (§3) rather than the game's win/loss rules — the mechanics in `logic.md` stay fixed regardless of how these values are tuned.
