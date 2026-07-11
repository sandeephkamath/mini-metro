# Core Logic Specification

**Version**: 1.7
**Last updated**: 2026-07-09

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
- A Resource's wait clock starts the instant it is added to a Node's queue — whether by spawning there or by transferring off a Carrier — and resets whenever it is added to a different Node's queue. It does not advance while the Resource is aboard a Carrier.

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

After every game tick, each Node is checked against two independent conditions: its maximum capacity, and how long the Resources currently in its queue have been waiting there. Either one is enough to put the Node at risk, and neither is immediately fatal — either starts the same grace window:

- **Entering risk**: the instant a Node's queue length reaches or exceeds its maximum capacity, *or* any Resource in its queue has been waiting (§2 Resource) at least the Patience Duration (`progression.md` §5), the Node enters **Overflow Risk** and a Grace Timer starts counting down from the Grace Duration (`progression.md` §5). If the Node was already in Overflow Risk when the other condition also becomes true, the existing Grace Timer keeps counting down unaffected — it does not reset or extend.
- **Recovery**: Overflow Risk ends immediately, discarding the Grace Timer, the instant *neither* condition holds any longer — the queue length has dropped back below capacity *and* no Resource remaining in the queue has waited past the Patience Duration. A later crossing of either condition starts a brand-new Grace Timer at full duration, never resuming a discarded one.
- **Expiry**: if the Grace Timer reaches zero while at least one of the two conditions still holds, the game ends — unless a Game-Over Continue offer is available and used (`monetization.md` § Game-Over Continue), in which case the session resumes instead and every Node currently in Overflow Risk is relieved as part of accepting that offer (see `monetization.md` §3 for exactly how).
- Each Node's Grace Timer is independent — multiple Nodes can be in Overflow Risk at once, each on its own countdown.
- Grace Duration and Patience Duration are each fixed for the whole session (`progression.md` §5) — nothing increases or decreases either once a session starts.

### Milestone Events

At regular time intervals — the Milestone Event interval — a Milestone Event fires, granting exactly one bonus of one of two kinds:

1. **Reserve Carrier** — adds one unplaced Carrier to the Reserve.
2. **Reserve Carriage** — adds one unplaced capacity upgrade to the Reserve.

A Milestone Event's bonus is always free — it never requires watching an ad. `monetization.md` layers two separate, optional ad-gated ways to get the same two bonus kinds on top of this (an on-demand mid-session request, and a Game-Over Continue) — neither replaces or alters the Milestone Event itself.

A single session-wide setting decides how the bonus kind is picked, the same way for every Milestone Event in the session (`progression.md` §6):

- **Auto mode**: the game picks the kind itself, with no player input.
- **Choice mode**: both kinds are offered as options. Presenting the choice pauses game time using the same mechanism as §6 Game Clock — every timer in the game, including other Nodes' Grace Timers and the countdown to the next Milestone Event, freezes until the player picks. Only the chosen kind is granted; the other is discarded, not banked for later.

Route unlocking is not part of a Milestone Event — Routes unlock purely from total Node count (`progression.md` §4).

### Scoring

One point is awarded per Resource delivered. Score accumulates throughout the session.

### Win / Loss

There is no win condition. The game ends when any Node overflows, and the final score is recorded.

### Creative Mode

After the game ends (Win / Loss above), the player may optionally keep playing the exact same board — same Nodes, Routes, Carriers, queued Resources, Score, and Week — in **Creative Mode**, instead of starting a fresh session. This is a distinct thing from a Game-Over Continue (`monetization.md` §3), which rescues a still-*active* session before it ends; Creative Mode is only ever offered once a session has already genuinely ended.

- **Entering**: presented as an option alongside restarting, at the moment the game ends. Choosing it resumes simulation immediately from the exact state the game ended in — nothing is reset, reshuffled, or rewound.
- **Rule change**: for the rest of this Creative Mode session, Node Overflow can never end the game again. A Node's Grace Timer still counts down and the same Overflow Risk warning still shows while it does — congestion is still visible and still worth resolving — but if it reaches zero, the Node is relieved automatically (the same relief a completed Game-Over Continue grants, `monetization.md` §3) instead of ending the session. A Game-Over Continue offer never appears in Creative Mode, since there is nothing left for it to rescue. Multiple Nodes expiring in the same instant are each relieved independently, same as normal Overflow Risk handling.
- **Everything else about the simulation is unchanged**: Resources keep spawning and being delivered, Score keeps increasing, the Game Clock keeps advancing, Milestone Events keep firing and granting bonuses, Routes can still be drawn/edited/deleted, the On-Demand Bonus Request (`monetization.md` §2) still works normally. Creative Mode is a rule change to Node Overflow specifically, not a different game mode with different mechanics.
- **Does not affect any already-recorded result**: the session's Final Weeks Survived (`meta_progression.md` §1) was already read and recorded at the moment the game ended, before Creative Mode was ever offered — nothing that happens afterward in Creative Mode revises Best Weeks Survived, the Leaderboard, or Collectible Reward progress. Creative Mode is purely a practice/sandbox continuation of a session whose result is already locked in, not a way to keep improving it.
- Leaving Creative Mode (returning to the home phase and starting a new session) has no lasting effect — a fresh session always starts under the normal Node Overflow rule.

---

## 4. Route Drawing Interaction

Route drawing is a continuous, preview-first interaction: a single drag can chain any number of Nodes, every provisional change is shown in the Route's real geometry before it takes effect, and nothing changes the actual Route until the player releases.

### Starting a drag

- Each end of a Route (once it has 2+ Nodes) has its own end marker, drawn as a short tab projecting from the terminal Node. A Node can host several end markers at once — one per Route ending there — and each is an independent drag target. When several end markers share a Node, they are kept at least a minimum angle apart: a marker may rotate away from its natural direction (the continuation of its Route's final segment) as far as needed so that every marker at that Node stays individually distinguishable and grabbable.
- Clicking a Route's end marker begins extending that specific Route from that end. Which Route gets extended is determined by which end marker was grabbed, not by which Node — a Node is never associated with a single color.
- Clicking a Node's body (anywhere that isn't a specific Route's end marker) always begins a new Route, even if the Node already belongs to one or more Routes. The next available unlocked Route color/identifier is reserved the moment the drag starts, so the preview draws in the Route's actual color; if no unlocked Route is free, the drag shows a neutral preview and can commit nothing.
- Clicking on a segment between two Nodes on an existing Route (rather than on a Node) begins a mid-Route insertion drag for that Route. Releasing it on a Node not already on the Route inserts that Node between the two Nodes of the grabbed segment (one Node per insertion drag).

### During the drag: the provisional chain

- Dragging across a Node adds it to the drag's **provisional chain**: passing within the Node capture tolerance appends that Node, provided it is not already on the Route or in the chain. One continuous drag can chain any number of Nodes this way.
- The provisional chain renders in the Route's real geometry — its color, its bend shapes — so the player sees exactly how the Route will form before releasing. Only the dangling leg from the last chained Node to the pointer renders as an uncommitted hint (dashed).
- Dragging back onto the previous Node in the chain removes the most recently added Node — an in-gesture undo. Backing all the way out leaves nothing to commit.
- **Shortening**: when extending from an end marker with nothing yet chained, dragging inward onto the Route's adjacent Node marks the terminal Node for detachment; continuing inward Node by Node marks more. Detachment-marked segments render faded to show they will be removed. A Route can never be shortened below two Nodes this way — removing a Route entirely stays the separate deletion gesture below. Chaining a fresh Node after marking detachments re-routes that end of the Route within the same gesture.

### Releasing

- Releasing commits the whole gesture at once: marked detachments are applied first, then chained Nodes are attached in order to the dragged end (prepended if it is the Route's first Node, appended if its last; a brand-new Route is created from its chain when it has two or more Nodes).
- Release capture uses a more generous hit tolerance around each Node than starting a drag or chaining mid-drag does — a release within that tolerance counts as releasing on the nearest such Node. Precision at the end of a drag is typically worse than at the start (the pointer/finger itself obscures the target), so this asymmetry is intentional: starting a Route stays precise (an accidental drag from empty space never silently grabs the wrong Node), while finishing one forgives a near miss.
- Releasing with nothing chained and nothing marked for detachment cancels the drag with no effect.
- When a shortening commit removes a segment a Carrier was on (or the Node it was stopped at), that Carrier relocates to the Route's new terminal Node and continues inward from there; Resources on board are unaffected.

### Hit tolerances are screen-space

Every drawing hit tolerance — Node capture, end markers, segment grabs, release capture — is defined in screen pixels, not world pixels. When the Camera is zoomed out below the default zoom, the world-space tolerance scales up by the inverse zoom so targets never shrink below their intended on-screen size; zoomed in past default, tolerances keep their base world size (the targets are already large on screen). Because a scaled-up tolerance can bring more than one Node into range at once, the nearest in-range Node always wins.

### Deleting a Route

- Deleting a Route is a separate gesture from the drawing interactions above: the player presses and holds the Route's own legend swatch (its color indicator in the persistent UI, not a point on the map) for a fixed duration. Releasing before that duration elapses cancels with no effect; releasing anywhere is equivalent to a release since the target is the swatch itself, not a map position. Holding it to completion deletes the Route (per §2 Route). This is a deliberate, confirmable action rather than a stray-drag risk — a Route is never deleted by anything that happens on the map/canvas itself.

---

## 5. Map & Viewport

The map (the full space in which Nodes can spawn) is larger than the visible viewport. The player sees the map through a Camera: a rectangular window defined by a center point and a zoom level.

- The Camera starts centered on the initial cluster of Nodes, at a zoom level that shows them clearly.
- New Nodes spawn near the existing cluster at first; the area they can spawn across widens gradually as more Nodes are placed, up to a bounded maximum extent that is deliberately smaller than the full map — the map's outer region is never spawned into and exists only as Camera panning space. This keeps the network compact enough that the automatic zoom-out (below) stays gentle for the whole session.
- Every new Node must additionally appear within a limited distance of at least one existing Node, so the network grows contiguously outward like a city — a new Node is never an isolated island far from everything, forcing Routes to stretch across empty space to reach it.
- The Camera holds still as long as every placed Node already fits in view with a small margin. The instant a newly spawned Node would fall outside that margin, the Camera automatically re-centers and zooms out just enough to bring every placed Node back into view — never zooming in tighter than the starting zoom level while doing so, and never adjusting itself when nothing has actually gone out of view.
- The player can manually zoom in or out, and pan the view, at any time. Manual adjustment permanently hands control of the Camera to the player for the rest of the session — the automatic keep-everything-in-view behavior described above does not resume afterward.
- The Camera cannot be zoomed out past the point where the whole map is visible, and cannot be panned to show space beyond the map's edges.
- Zooming and panning are purely a viewing convenience — they never change Node positions, Route geometry, or any other game rule.

---

## 6. Game Clock

All timers use game time, not wall time. Game time advances only while the game is in the playing state. Pausing freezes all timers.

Two independent things can pause the clock — a Milestone Event Choice being presented (§3) and the player's own Pause control — either one freezes every timer via the same mechanism; nothing else about the game (drawing/editing Routes, panning/zooming the camera) is blocked while paused.

The player may also run the clock at a faster rate than normal (Fast-Forward) rather than only pausing it. Pause, normal speed, and Fast-Forward are three mutually exclusive states the player can select at any time during play — selecting a speed while paused resumes the clock at that speed. This is a normal player control, not a debug/QA-only feature — whether it is actually shown in the HUD is gated by a build-time configuration flag (theme config), on by default. While disabled, the clock simply always runs at normal speed and only the Milestone-Event-Choice pause applies; enabling the flag does not change the mechanism described above.

---

## 7. Audio Cues

The game has two theme-neutral audio layers: a continuous **Background Music** track and one-shot **Audio Cues** tied to specific rule moments.

**Background Music.** Exactly one of two Music Tracks plays at a time: a Menu Track (while the game is in the home/menu state or the game-over state — neither is "in session") and a Session Track (while the game is in the playing state, including while paused, a Milestone Event Choice is presented, or an ad-gated flow is open — all of those are still "in session"). Switching states swaps the track; the same track continues playing across a swap that resolves back to the same state (e.g. pausing and resuming does not restart the Session Track). Both tracks loop indefinitely and are stylistically and harmonically related — a theme is free to build its Audio Cues (below) from the same musical material as its Music Tracks so they read as one soundscape rather than clashing overlays.

**Audio Cues.** A short, non-looping sound plays once at each of the following moments:

| Cue | Fires when |
|-----|-----------|
| Resource Delivered | A Resource reaches a Node matching its destination type (§3 Delivery) |
| Node Spawned | A new Node is added to the map (§3 Node lifecycle) |
| Route Committed | A drag gesture that adds at least one Node to a Route is released (§4) |
| Milestone Event | A Milestone Event fires, whether it auto-grants a bonus or opens the Choice popup (§3 Milestone Events) |
| Overflow Risk Started | A Node's Grace Timer starts counting down (§3 Node Overflow) |
| Game Over | The session ends, by either the Grace Timer expiring with no Continue offered, or a Continue offer being declined (§3 Node Overflow) |

Cues are fire-and-forget: overlapping cues (e.g. several Resources delivered in the same instant) are each allowed to sound rather than being coalesced into one, though a theme may apply a short per-cue cooldown purely to avoid audio clipping/distortion from stacking identical sounds, not to suppress the underlying event. Background Music and Audio Cues each have their own independent player-facing on/off control (theme-defined placement) rather than a single shared mute — a player may want ambient music off while keeping short Audio Cues on, or vice versa. Both are presentation settings only and never change game rules or timing.

Because browsers require a user gesture before audio can play, Background Music should still attempt to start immediately (muted) when a state is entered, rather than waiting for a gesture first — muted playback is broadly allowed without one. The first gesture, whenever it arrives, then simply unmutes whatever track is already running, so the player hears the correct track for whichever state they're actually in at that moment rather than one they may have already left (e.g. a state's music never actually being heard because the player's first-ever gesture was already the action that moved them to the next state). This muted-then-unmute dance exists only to work around that gesture requirement — a runtime with no such requirement should just start audible Background Music immediately, with nothing to unmute later.

Background Music also pauses whenever the game itself is not in the foreground (the app backgrounded, the browser tab hidden) and resumes exactly where it left off — including its mute/unmute state — the moment it's in the foreground again. It should never keep looping, audible, while the player isn't there to hear it.

---

## 8. Architecture Constraints

- Game state is a single mutable object updated each frame. UI state (score, phase) is a shallow copy synchronised at ~10Hz.
- The render loop must be stable: it must not restart on UI re-renders.
- All game logic is pure — no DOM or canvas access inside logic functions.
- ID counters for all entities live inside game state, not in module scope, to prevent re-render side effects.

---

## 9. Terminology Reference

| Abstract Term | Definition |
|---------------|-----------|
| Node | A fixed point on the map with a type; accumulates Resources |
| Route | An ordered sequence of Nodes; traversed by Carriers |
| Carrier | A vehicle that moves along a Route picking up and delivering Resources |
| Resource | A unit with a destination type waiting at a Node |
| Milestone Event | A periodic event granting a free Reserve Carrier or Reserve Carriage |
| Reserve | Holding area for unplaced Carriers/Carriages granted by Milestone Events until assigned |
| Overflow Risk | The state a Node enters at/over capacity, during which a Grace Timer counts down before the game ends |
| Transfer Node | A Node that belongs to two or more Routes |
