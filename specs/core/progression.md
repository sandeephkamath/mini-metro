# Progression & Difficulty Specification

**Version**: 2.3
**Last updated**: 2026-07-09
**Extends**: `./logic.md`

This document defines the theme-neutral rules that govern pacing and difficulty: how often Nodes and Resources spawn, how that rate changes over time, and how Route/Carrier unlocks progress. It is the tuning layer that sits between the fixed mechanics in `logic.md` and each theme's concrete numbers (e.g. `themes/metro.md` §5 Configuration Values). It contains no concrete numbers of its own and no rendering/UI references — only the shape of each rule and the parameters a theme must supply.

Use this document when you want to reason about or change the game's difficulty curve without touching core mechanics.

---

## 1. Node Spawn Rate

New Nodes appear on a fixed timer, at a random valid position, until a maximum count is reached.

- A position is valid if it is at least the minimum spacing away from every existing Node, within the max neighbor distance of at least one existing Node (core §5 — the network grows contiguously), inside the current spawn area, and at least the edge margin away from the map bounds.
- The spawn area grows with Node count from its starting size up to its maximum size (core §5) — the maximum is a deliberate cap smaller than the map itself.
- New Node types are distributed to keep type counts roughly balanced, among whichever types are currently unlocked (§1.1) — see core §2 Node.

| Parameter | Meaning |
|-----------|---------|
| Node spawn interval | Time between Node spawn attempts |
| Node min spacing | Minimum allowed distance between any two Nodes |
| Node max neighbor distance | Maximum allowed distance between a new Node and its nearest existing Node |
| Node spawn area starting size | Spawn area right after the initial cluster |
| Node spawn area maximum size | Ceiling the spawn area grows toward as Node count climbs — smaller than the map |
| Node edge margin | Minimum allowed distance between a Node and the map edge |
| Max Node count | Spawning stops once this many Nodes exist |

### 1.1 Node Type Unlock

A fixed set of Node types are available from session start. Additional Node types unlock gradually over time, each on its own week threshold, so a new type is never introduced faster than the player can absorb it.

- Each additional Node type has an unlock week; it becomes eligible for new Node spawns (§1) once the current week number reaches that threshold.
- Node type unlock is driven purely by elapsed week number — independent of Node count, Route unlocks (§4), and Milestone Events (§6).
- Once unlocked, a type stays unlocked for the rest of the session; nothing in core reverses it.
- Existing Nodes never change type after being placed — an unlock only affects the type pool future spawns are drawn from.

| Parameter | Meaning |
|-----------|---------|
| Initial unlocked Node type count | Node types available at session start |
| Node type unlock week (per additional type) | Week number at which that type joins the eligible pool |

---

## 2. Resource Spawn Rate

On each Resource spawn tick, a growing batch of eligible Nodes (not just one) each receive a new Resource. Two curves govern this, both driven by the current week number:

- **Tick interval**: the time between spawn ticks shrinks over time following a decay curve, bounded below by a floor so it never reaches zero.

  Shape: `interval(week) = max(floor, base × decayRate ^ week)`

- **Batch fraction**: the share of eligible Nodes that receive a Resource on a given tick grows over time following a growth curve, bounded above by a ceiling so it never spawns to more than that share of Nodes at once. At least one eligible Node always receives a Resource on a tick, even if the fraction rounds down to zero.

  Shape: `fraction(week) = min(maxFraction, baseFraction × growthRate ^ week)`

A Node is eligible for a given tick only if its queue has room; each eligible Node picked in the batch is evaluated independently for a valid destination type.

| Parameter | Meaning |
|-----------|---------|
| Resource spawn base interval | Tick interval at week 0 |
| Resource spawn decay rate | Multiplier applied to the tick interval once per week (< 1 shortens it) |
| Resource spawn floor | Minimum tick interval the decay curve will not cross |
| Resource spawn batch base fraction | Share of eligible Nodes spawned to per tick, at week 0 |
| Resource spawn batch growth rate | Multiplier applied to the batch fraction once per week (> 1 grows it) |
| Resource spawn batch max fraction | Maximum share of eligible Nodes the batch fraction will not cross |

If a Node has no valid destination type anywhere on the map, its spawn attempt is skipped (see core §2 Resource) rather than deferred or queued.

---

## 3. Effective Waiting Budget (derived, not a separate mechanic)

Node Overflow (core §3) has two independent triggers into Overflow Risk: a Node's queue reaching capacity, and any single Resource waiting past the Patience Duration (§5) regardless of queue length. The capacity-driven trigger has no "max wait timer" of its own — the amount of time a Resource can realistically wait before its Node *reaches* capacity in the first place is a *derived* quantity, not a rule of its own:

```
effective wait budget ≈ Node capacity ÷ (Resource arrival rate at that Node − relief rate from Carriers serving it)
```

This section exists so difficulty can be reasoned about in terms of "how long can a Resource wait before things get dangerous on a busy Node," by adjusting the upstream parameters below rather than adding a new failure condition:

- Raising Node capacity, slowing Resource spawn rate, or unlocking Routes/Carriers sooner all increase tolerable wait.
- Lowering Node capacity, speeding up Resource spawn decay, or leaving a Node poorly served all decrease it.
- This derived budget describes the time before a Node *reaches* capacity in the first place. Once it does, the explicit Grace Timer (§5) takes over and governs how much longer the Node can stay over capacity before the game ends — the two are sequential, not overlapping: the wait budget above ends exactly where the Grace Timer begins.
- The Patience Duration trigger (§5) is unrelated to this derived budget — it is a flat, explicit ceiling that applies even to a Node whose queue never comes close to capacity (e.g. a Node connected by a Route so indirect or infrequent that one Resource sits unboarded far longer than any of its neighbors, without ever being joined by enough others to trip the capacity trigger).

---

## 4. Route Unlock Progression

A fixed number of Routes are unlocked at game start (core §2 Route). Additional Routes unlock purely from the total Node count present on the map — not from any timer, and not from Milestone Events.

- Each time total Node count increases by the Route unlock step (a fixed number of additional Nodes), the next locked Route, in a fixed order, unlocks — provided any remain.
- Formula: `unlocked Route count = min(Total Route count, Initial unlocked Route count + floor((current Node count − Initial Node count) / Route unlock step))`, re-checked whenever a new Node spawns.
- Node spawning (§1) and Route unlocking are independent systems layered on the same input (Node count) — Route unlocking only reads the current count, it never affects spawn timing or vice versa.

| Parameter | Meaning |
|-----------|---------|
| Initial unlocked Route count | Routes available at game start |
| Total Route count | Routes available across the whole session |
| Route unlock step | Additional Nodes required, beyond the last unlock, to unlock the next Route |

---

## 5. Overflow Risk Triggers & Grace Period

Node Overflow (core §3) does not end the game the instant a Node enters Overflow Risk — a Grace Timer (core §3 Node Overflow) gives the player a window to relieve it first, regardless of which of the two triggers below started it.

| Parameter | Meaning |
|-----------|---------|
| Grace Duration (base) | How long a Node's Grace Timer runs, before the game ends |
| Patience Duration | How long any single Resource may sit in a Node's queue before that alone puts the Node into Overflow Risk, independent of queue length |

Grace Duration and Patience Duration are each fixed for the entire session — nothing in core increases or decreases either once the session starts.

---

## 6. Milestone Event Bonuses

Milestone Events (core §3) fire on a fixed interval and grant exactly one of two bonus kinds: a Reserve Carrier or a Reserve Carriage. This bonus is always free — see `monetization.md` for the separate, optional ad-gated ways to obtain the same two kinds outside of a Milestone Event.

### 6.1 Auto Mode vs. Choice Mode

A single session-wide setting decides how the bonus kind is picked, the same way for every Milestone Event in the session — it does not vary event-to-event:

- **Auto mode**: the game cycles through both kinds in a fixed round-robin order (Reserve Carrier → Reserve Carriage → repeat), so both recur at a predictable, even rate over a long session, with no player input.
- **Choice mode**: both kinds are offered as options every time; the player picks exactly one, the other is discarded for that event (core §3 Milestone Events).

A theme may expose Auto vs. Choice as a difficulty-preset knob rather than a single fixed value — see §8 Tuning Guidance.

| Parameter | Meaning |
|-----------|---------|
| Milestone Event interval | Time between Milestone Events |
| Milestone bonus mode | Auto or Choice — which selection rule governs every Milestone Event this session |
| Reserve Carriage capacity bonus | How much capacity a single Reserve Carriage adds once attached to a Carrier |

---

## 7. Difficulty Levers Reference

All parameters named above, in one place. A theme fills these in as concrete values (e.g. `themes/metro.md` §5 Configuration Values) or preset tables for different difficulty modes.

| Lever | Governs |
|-------|---------|
| Node spawn interval | How fast new Nodes appear |
| Node min spacing | Map density |
| Node max neighbor distance | How contiguously the network grows (smaller = tighter cluster) |
| Node spawn area maximum size | How far the network can ultimately sprawl (drives late-game zoom-out) |
| Node edge margin | Playable map area |
| Max Node count | Session length ceiling before Node spawning stops |
| Initial unlocked Node type count | Starting type variety the player must learn |
| Node type unlock week (per type) | How quickly new type variety is introduced |
| Resource spawn base interval | Starting Resource pressure per Node |
| Resource spawn decay rate | How quickly Resource pressure ramps up |
| Resource spawn floor | Maximum Resource pressure at late game (tick frequency) |
| Resource spawn batch base fraction | Starting Resource pressure per tick (how many Nodes at once) |
| Resource spawn batch growth rate | How quickly Resource pressure per tick ramps up |
| Resource spawn batch max fraction | Maximum Resource pressure per tick at late game |
| Initial unlocked Route count | Starting player capability |
| Total Route count | Ceiling on player capability |
| Route unlock step | How quickly Route access scales with map growth |
| Node capacity | Queue size before a Node enters Overflow Risk |
| Patience Duration | How long a single Resource can wait before it alone triggers Overflow Risk |
| Grace Duration (base) | How long a Node can stay over capacity before the game ends |
| Milestone Event interval | How often the player gets a free Reserve item |
| Milestone bonus mode | Whether relief is auto-granted or player-chosen |
| Reserve Carriage capacity bonus | How much relief one Carriage adds per attachment |

---

## 8. Tuning Guidance

- **Easier**: increase Node capacity, increase Patience Duration, increase Grace Duration (base), increase Resource spawn base interval/floor or slow the decay rate, lower the batch base/max fraction or slow the batch growth rate, push Node type unlock weeks later (or raise the initial unlocked count so there's less to learn later), increase initial unlocked Routes or lower the Route unlock step, shorten the Milestone Event interval, raise the Reserve Carriage capacity bonus.
- **Harder**: the inverse of the above — lower Node capacity, shorter Patience Duration, shorter Grace Duration, faster Resource spawn decay, higher batch base/max fraction or faster batch growth rate, pull Node type unlock weeks earlier, fewer starting Routes or a higher Route unlock step, longer Milestone Event interval.
- Auto mode is generally the gentler, more predictable pacing choice; Choice mode adds strategic depth (and a pause point) but puts bonus-allocation judgment on the player, which can be harder for a first-time player under time pressure.
- Changing any single lever shifts the effective waiting budget (§3) or the Grace Period (§5) rather than the game's win/loss rules — the mechanics in `logic.md` stay fixed regardless of how these values are tuned. Patience Duration is the one lever that bypasses the derived waiting-budget math entirely (§3) — it caps a single Resource's wait directly.
