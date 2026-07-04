# Core Logic Specification

**Version**: 1.0
**Last updated**: 2026-07-04

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
- A fixed number of Routes are unlocked at game start; more are unlocked via delivery events.

### Carrier

A vehicle that travels back and forth along a Route, collecting and delivering Resources.

- One Carrier is automatically added when a Route gets its second Node.
- Carriers move at a fixed speed in pixels per second.
- A Carrier stops at each Node for a fixed duration. On arrival it drops off Resources; just before departing it picks up Resources.
- At each end of the Route the Carrier reverses direction.
- A Carrier has a maximum Resource capacity (upgradeable via delivery events).
- When multiple Carriers share a Route they are evenly spaced along the full length of the Route.

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

After every game tick, each Node is checked. If any Node's queue length exceeds its maximum capacity, the game ends immediately.

A visual warning appears on Nodes that are at or near capacity.

### Delivery Events

At regular time intervals a delivery event fires automatically:

- One new Carrier is added to the active Route with the fewest Carriers.
- One locked Route is unlocked (if any remain).
- The busiest Carrier gains additional capacity.

The event is instantaneous — the game does not pause. A brief notification appears.

### Scoring

One point is awarded per Resource delivered. Score accumulates throughout the session.

### Win / Loss

There is no win condition. The game ends when any Node overflows. The final score is displayed.

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

---

## 5. Game Clock

All timers use game time, not wall time. Game time advances only while the game is in the playing state. Pausing freezes all timers.

---

## 6. Architecture Constraints

- Game state is a single mutable object updated each frame. UI state (score, phase) is a shallow copy synchronised at ~10Hz.
- The render loop must be stable: it must not restart on UI re-renders.
- All game logic is pure — no DOM or canvas access inside logic functions.
- ID counters for all entities live inside game state, not in module scope, to prevent re-render side effects.

---

## 7. Terminology Reference

| Abstract Term | Definition |
|---------------|-----------|
| Node | A fixed point on the map with a type; accumulates Resources |
| Route | An ordered sequence of Nodes; traversed by Carriers |
| Carrier | A vehicle that moves along a Route picking up and delivering Resources |
| Resource | A unit with a destination type waiting at a Node |
| Delivery Event | A periodic reward that grants new Carriers, Routes, or capacity |
| Transfer Node | A Node that belongs to two or more Routes |
