# Core Logic Specification

**Version**: 1.4
**Last updated**: 2026-07-05

This document defines the game's mechanics in theme-neutral terms. Themes extend this document by mapping these abstract concepts to named entities and providing configuration values.

---

## 1. What the Game Is

A real-time resource allocation game played on a 2D map. The player draws Routes connecting Nodes to keep Resources flowing. Nodes accumulate Resources over time. If any Node exceeds its capacity the game ends. The player scores points by delivering Resources to their destinations.

---

## 2. Entities

### Node

A fixed point on the map. Each Node has a **type**. Resources wait at Nodes until collected by a Carrier.

- Nodes have a maximum capacity. Exceeding it ends the game.
- Nodes spawn over time at random positions subject to minimum spacing rules.
- New Node types are distributed to keep type counts balanced.
- A Node may belong to multiple Routes (transfer Node).
- Once placed, a Node's position is permanent for the rest of the session — Nodes never move.

### Resource

A unit waiting at a Node with a desired destination type different from the Node it is waiting at.

- Resources spawn at Nodes periodically. The spawn rate increases over time (shorter interval each cycle).
- The destination type must be a type that exists on the map; otherwise the spawn is skipped.
- Resources wait in a FIFO queue at their Node.
- A Resource is delivered when it arrives at a Node whose type matches its destination type. Delivery scores one point.

### Route

An ordered sequence of Nodes connected by segments. One or more Carriers travel along it.

- A Route must have at least two Nodes before any Carrier is placed on it.
- Nodes can be added at either end of a Route.
- Nodes can also be inserted into the middle of a Route: dragging from a point along an existing segment to a Node not already on the Route splits that segment and inserts the Node between its two neighbors.
- Branching (a Route splitting into more than one path from a single Node) is not allowed.
- A Route cannot contain the same Node twice.
- The player draws Routes by dragging between Nodes.
- A fixed number of Routes are unlocked at game start; more unlock as the total Node count grows (see `progression.md` §4) — Route unlocking is not tied to Milestone Events.
- A Route with at least one Node can be deleted outright by the player (§4 Route Drawing Interaction covers the gesture). Deleting a Route removes every Carrier on it — any Resources those Carriers were holding are discarded, not returned to any Node's queue — and detaches every Node that was only reachable via this Route. The Route's identifier/color is not consumed: it immediately becomes an empty, already-unlocked Route ready to be drawn again, exactly as if it had never been drawn.

### Carrier

A vehicle that travels back and forth along a Route, collecting and delivering Resources.

- One Carrier is automatically added when a Route gets its second Node. This is the only Carrier a Route gains automatically — a Route never grows its own Carrier count over time; further Carriers only arrive via the Reserve (below).
- Carriers move at a fixed speed in pixels per second.
- A Carrier stops at each Node for a fixed duration. On arrival it drops off Resources; just before departing it picks up Resources.
- At each end of the Route the Carrier reverses direction.
- A Carrier has a maximum Resource capacity, increased only by attaching a Reserve Carriage (below).
- When multiple Carriers share a Route they are evenly spaced along the full length of the Route. Placing an additional Carrier from the Reserve onto a Route re-triggers this spacing for every Carrier already on it.

### Reserve

A holding area for two kinds of unassigned reward granted by Milestone Events (§3), until the player assigns them:

- **Reserve Carrier**: an unplaced Carrier, not yet on any Route.
- **Reserve Carriage**: an unplaced capacity upgrade, not yet attached to any Carrier.

- Reserve items accumulate without limit or expiry — granting a new one while others are still unassigned does not replace or discard them.
- A Reserve Carrier can be assigned, at any time, to any unlocked Route that already has at least one Carrier of its own. Assigning it places the Carrier on that Route immediately, re-spacing all Carriers on it per the rule above.
- A Reserve Carriage can be assigned, at any time, to any single Carrier currently in service on any Route, immediately increasing that Carrier's capacity.
- Both kinds of assignment are player-initiated and instantaneous; there is no rule requiring an item to be assigned before the next Milestone Event fires.

---

## 3. Core Rules

### Resource Routing (boarding)

Before a Resource boards a Carrier, the Carrier must be able to deliver it within one transfer:

1. **Direct delivery check**: if the destination type appears at any future Node on this Carrier's Route in the current direction of travel, the Resource boards.

2. **Anti-bounce check**: if the current Node already has a different Route that directly contains the destination type, the Resource does not board this Carrier — it waits for that connecting Carrier instead.

3. **One-hop transfer check**: if a future Node on this Carrier's Route has a connecting Route that directly contains the destination type, the Resource boards (it will transfer at that future Node).

"Future Nodes" excludes the Node being departed from. At endpoints, the effective direction is the reversed direction (the Carrier is about to turn around, so all other Nodes are ahead).

### Resource Disembarkation (dropping off)

When a Carrier arrives at a Node:

- Resources whose destination type matches the Node type are delivered and removed (score +1 each).
- Resources whose destination type is not on this Carrier's Route at all, but a different Route at this Node directly has that type, are transferred to the Node queue (to board the connecting Carrier).
- If the Node queue is full, transferred Resources stay on the Carrier.
- All other Resources remain on the Carrier.

Boarding happens just before the Carrier departs, not on arrival. This separation prevents a transferred Resource from immediately re-boarding the same Carrier.

### Node Overflow

After every game tick, each Node is checked against its maximum capacity. Reaching capacity is not immediately fatal — it starts a grace window:

- **Entering risk**: the instant a Node's queue length reaches or exceeds its maximum capacity, the Node enters **Overflow Risk** and a Grace Timer starts counting down from the Grace Duration (`progression.md` §5).
- **Recovery**: if the queue length drops back below capacity while the Grace Timer is still running, Overflow Risk ends immediately and the Grace Timer is discarded — a later crossing back over capacity starts a brand-new Grace Timer at full duration, never resuming a discarded one.
- **Expiry**: if the Grace Timer reaches zero while the Node is still at or over capacity, the game ends immediately.
- Each Node's Grace Timer is independent — multiple Nodes can be in Overflow Risk at once, each on its own countdown.
- A Grace Duration increase (from a Milestone Event, below) takes effect immediately: it extends the remaining time on every Node currently in Overflow Risk, in addition to lengthening all future Grace Timers for the rest of the session.

### Milestone Events

At regular time intervals — the Milestone Event interval — a Milestone Event fires, granting exactly one bonus of one of three kinds:

1. **Reserve Carrier** — adds one unplaced Carrier to the Reserve.
2. **Reserve Carriage** — adds one unplaced capacity upgrade to the Reserve.
3. **Grace Duration increase** — increases the Grace Duration (Node Overflow, above) by a fixed increment, applied immediately.

A single session-wide setting decides how the bonus kind is picked, the same way for every Milestone Event in the session (`progression.md` §6):

- **Auto mode**: the game picks the kind itself, with no player input.
- **Choice mode**: all three kinds are offered as options. Presenting the choice pauses game time using the same mechanism as §6 Game Clock — every timer in the game, including other Nodes' Grace Timers and the countdown to the next Milestone Event, freezes until the player picks. Only the chosen kind is granted; the other two are discarded, not banked for later.

Route unlocking is not part of a Milestone Event — Routes unlock purely from total Node count (`progression.md` §4).

### Scoring

One point is awarded per Resource delivered. Score accumulates throughout the session.

### Win / Loss

There is no win condition. The game ends when any Node overflows, and the final score is recorded.

---

## 4. Route Drawing Interaction

- Each end of a Route (once it has 2+ Nodes) has its own end marker, drawn as a short tab projecting from the terminal Node. A Node can host several end markers at once — one per Route ending there — and each is an independent drag target.
- Clicking a Route's end marker begins extending that specific Route from that end. Which Route gets extended is determined by which end marker was grabbed, not by which Node — a Node is never associated with a single color.
- Clicking a Node's body (anywhere that isn't a specific Route's end marker) always begins a new Route using the next available unlocked Route color/identifier, even if the Node already belongs to one or more Routes.
- Releasing on a different Node completes the segment, subject to:
  - Target Node must not already be on the same Route.
  - Source Node must be at one of the Route's two ends.
  - If source is the first Node, target is prepended; if last, target is appended.
- Clicking on a segment between two Nodes on an existing Route (rather than on a Node) begins a mid-Route insertion drag for that Route.
- Releasing a mid-Route insertion drag on a Node not already on the Route inserts that Node between the two Nodes of the grabbed segment.
- Releasing anywhere other than a valid Node cancels the drag.
- Completing a drag (the two bullets above, plus the mid-Route insertion release) uses a more generous hit tolerance around each Node than starting one does — a release within that tolerance counts as releasing on the nearest such Node, not only a release exactly on its body. Precision at the end of a drag is typically worse than at the start (the pointer/finger itself obscures the target), so this asymmetry is intentional: starting a Route stays precise (so an accidental drag from empty space never silently grabs the wrong Node), while finishing one forgives a near miss.
- Deleting a Route is a separate gesture from the drawing interactions above: the player presses and holds the Route's own legend swatch (its color indicator in the persistent UI, not a point on the map) for a fixed duration. Releasing before that duration elapses cancels with no effect; releasing anywhere is equivalent to a release since the target is the swatch itself, not a map position. Holding it to completion deletes the Route (per §2 Route). This is a deliberate, confirmable action rather than a stray-drag risk — a Route is never deleted by anything that happens on the map/canvas itself.

---

## 5. Map & Viewport

The map (the full space in which Nodes can spawn) is larger than the visible viewport. The player sees the map through a Camera: a rectangular window defined by a center point and a zoom level.

- The Camera starts centered on the initial cluster of Nodes, at a zoom level that shows them clearly.
- New Nodes spawn near the existing cluster at first; the area they can spawn across widens gradually as more Nodes are placed, only reaching the map's full extent once the Node count is well established. This keeps growth of the visible area gradual rather than an early Node appearing anywhere on the map at once.
- The Camera holds still as long as every placed Node already fits in view with a small margin. The instant a newly spawned Node would fall outside that margin, the Camera automatically re-centers and zooms out just enough to bring every placed Node back into view — never zooming in tighter than the starting zoom level while doing so, and never adjusting itself when nothing has actually gone out of view.
- The player can manually zoom in or out, and pan the view, at any time. Manual adjustment permanently hands control of the Camera to the player for the rest of the session — the automatic keep-everything-in-view behavior described above does not resume afterward.
- The Camera cannot be zoomed out past the point where the whole map is visible, and cannot be panned to show space beyond the map's edges.
- Zooming and panning are purely a viewing convenience — they never change Node positions, Route geometry, or any other game rule.

---

## 6. Game Clock

All timers use game time, not wall time. Game time advances only while the game is in the playing state. Pausing freezes all timers.

Two independent things can pause the clock — a Milestone Event Choice being presented (§3) and the player's own Pause control — either one freezes every timer via the same mechanism; nothing else about the game (drawing/editing Routes, panning/zooming the camera) is blocked while paused.

The player may also run the clock at a faster rate than normal (Fast-Forward) rather than only pausing it. Pause, normal speed, and Fast-Forward are three mutually exclusive states the player can select at any time during play — selecting a speed while paused resumes the clock at that speed. This is a normal, always-available player control, not a debug/QA-only feature.

---

## 7. Architecture Constraints

- Game state is a single mutable object updated each frame. UI state (score, phase) is a shallow copy synchronised at ~10Hz.
- The render loop must be stable: it must not restart on UI re-renders.
- All game logic is pure — no DOM or canvas access inside logic functions.
- ID counters for all entities live inside game state, not in module scope, to prevent re-render side effects.

---

## 8. Terminology Reference

| Abstract Term | Definition |
|---------------|-----------|
| Node | A fixed point on the map with a type; accumulates Resources |
| Route | An ordered sequence of Nodes; traversed by Carriers |
| Carrier | A vehicle that moves along a Route picking up and delivering Resources |
| Resource | A unit with a destination type waiting at a Node |
| Milestone Event | A periodic event granting a Reserve Carrier, a Reserve Carriage, or a Grace Duration increase |
| Reserve | Holding area for unplaced Carriers/Carriages granted by Milestone Events until assigned |
| Overflow Risk | The state a Node enters at/over capacity, during which a Grace Timer counts down before the game ends |
| Transfer Node | A Node that belongs to two or more Routes |
