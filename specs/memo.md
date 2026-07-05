# Future Considerations

Running list of things not yet decided or implemented. Not a spec — just a backlog to work through and turn into real spec entries (`specs/`) once decided.

---

## Styling / Visual Polish

- Only one visual theme exists (Metro). Decide if alternate themes (e.g. water pipes, blood vessels, airline routes) are worth building on top of `core/logic.md`.
- No animations for station spawn, passenger boarding/alighting, or train arrival — everything pops in/out instantly.
- No sound effects or music (noted in metro.md divergences).
- Canvas is a fixed 800×600 — no responsive scaling for different window/screen sizes.
- Overflow warning is a pulsing red ring — consider whether near-capacity states need earlier/gentler visual cues (e.g. color ramp before red).
- No dark mode.

## Scoring

- Current scoring is flat: +1 per delivered passenger, no multipliers or bonus scoring.
- No distinction between a short trip and a long multi-transfer delivery — consider whether harder deliveries should score more.
- No combo/streak mechanic.
- No persistent high score — every session starts from zero and nothing is saved (noted in metro.md divergences).

## Levels / Maps

- Single fixed map only. Original Mini Metro has multiple cities with different layouts and constraints (rivers, tunnels). Explicitly deferred — no obstacle/river mechanic for MVP; revisit only if a single map's procedural variety proves insufficient.
- Levels and long-term progression are now specified: `specs/core/meta_progression.md` (theme-neutral Level/Best-Level/Collectible-Reward rules) and `specs/themes/metro.md` §9 (concrete Picture Collection values). Not yet implemented in code.

## Carriers / Trains / Line Unlocks / Overflow Grace

Now specified — not yet implemented in code:

- Reserve (free-floating Depot Trains/Carriages, player-placed): `core/logic.md` §2 Reserve, §3 Milestone Events.
- Auto vs. Choice bonus selection: `core/progression.md` §6.
- Line unlocks driven by Station count instead of the Weekly Upgrade timer: `core/progression.md` §4, `themes/metro.md` §3.
- Overflow Risk / Grace Timer replacing instant game-over: `core/logic.md` §3 Node Overflow, `core/progression.md` §5, `themes/metro.md` §5 config values.

Current code still has the old behavior (Delivery Events auto-adding a Carrier to the least-served Line, Lines unlocking on the Weekly Delivery timer, and instant overflow on capacity exceeded) — this whole cluster needs implementing together since the mechanics are now interdependent (e.g. the Grace Timer redesign changes what "Node Overflow" even checks).

## Analytics

- No analytics or telemetry at all currently. Open questions before adding any:
  - What events matter — session start/end, game over cause, score, session length, delivery events reached?
  - Where would events go (local only vs. a backend)?
  - Does this need to respect any privacy/consent requirement given no accounts exist today?

## Mobile / Responsive

- No touch input support — game only handles mouse events (`useMouseInput.ts`), including the Camera's scroll-to-zoom / drag-to-pan controls (`src/logic/camera.ts`, `core/logic.md` §5). No pinch-to-zoom or touch-drag-to-pan equivalent yet.
- Canvas is a fixed 800×600 (`GameCanvas.tsx`) — no responsive scaling to viewport size or `devicePixelRatio`. Will render small/cropped/blurry on phone screens as-is.

### Android Packaging (decision pending)

Game is planned to ship as an Android app eventually. Packaging mechanism not yet decided — do not start packaging work until this is resolved. Web app must remain a fully supported, undiverged target regardless of which option is picked.

Ruled out: full native Android (Kotlin/Java) rewrite, Trusted Web Activity, and PWA-only install — not feasible/not being considered.

Remaining options:
- **Capacitor** — wraps the existing Vite build in a native WebView shell; reuses `src/render/` and all game logic untouched; produces a real Play Store APK/AAB. Lowest effort, no renderer fork.
- **React Native + `react-native-webview`** — embeds the same web build inside an RN shell. Functionally equivalent to Capacitor with extra RN ecosystem overhead for no clear gain; not a distinct option so much as a strictly heavier version of Capacitor.
- **React Native + native rendering** (e.g. `react-native-skia`) — true native rendering/feel, but requires rewriting `src/render/` entirely (RN has no HTML canvas) and maintaining two divergent renderers (canvas for web, Skia for Android) going forward.

Working lean: Capacitor, since it's the only remaining option that doesn't fork the render layer — but no commitment yet. Revisit once there's a concrete reason to prefer React Native (native perf requirement, RN plugin ecosystem need, or a business reason to standardize on RN).

## Camera / Zoom

- Once the player manually zooms or pans, the automatic keep-everything-in-view behavior (`core/logic.md` §5) is permanently disabled for the rest of the session — there's no "recenter" or "reset view" control to hand control back to auto-fit. Revisit if this proves annoying in practice (e.g. after an accidental scroll).
- No on-screen zoom indicator (percentage or slider) — only implicit visual feedback from Station/Line size changing.

## Persistence

- No save/resume — closing the tab loses all progress.
- No high score storage. Best Level Reached and Picture Collection progress are now spec'd (`core/meta_progression.md`) as persistent values — local storage is the obvious backing store, but this isn't implemented in code yet.

## Onboarding / UX

- No pause functionality outside of debug mode's speed controls.
- No confirmation before restart from the game over screen.

### First-Time User Experience (FTUE)

Current onboarding is a single static modal (`StartScreen.tsx`) shown before every game, identical for a brand-new player and someone on their 50th run. Breakdown by moment in the flow:

**Pre-game (start screen)**
- Only three static bullet hints ("Drag from station to station...", "Trains carry passengers...", "Don't let stations overflow!") — no visual demonstration (e.g. a looping animated preview of a drag-to-draw-line action) alongside the text.
- No distinction between a first-ever session and a returning one — there's no persistence to track "has played before" (see Persistence section above), so the same screen shows every time by necessity, not by choice.
- Doesn't explain what a "Week" is, that Lines unlock as more Stations appear while Trains/Carriages/Risk Timer bonuses come from the Weekly Upgrade, or that an overflowing Station only has a limited Risk Timer window before it's fatal — "don't let stations overflow" states the rule but not the mechanic or the consequence.
- No easier/slower pacing option for new players. First-timers get the same spawn-rate decay curve (`core/progression.md`) as an experienced player on run 50.

**First minute of gameplay**
- No guided first action. Nothing highlights or pulses the first two stations a new player should connect — the drag gesture has to be inferred purely from the pre-game bullet list, with no in-canvas affordance (arrow, glow, cursor hint) pointing at valid click targets.
- No contextual, first-occurrence hints tied to real events — first passenger spawn, first station nearing capacity, first Weekly Upgrade choice all fire identically for new and veteran players. The only always-on hint is the small HUD corner text (`HUD.tsx`: "drag between stations to draw lines"), which is static and easy to miss.
- The only in-game overflow signal is the pulsing red ring (see Styling section) — nothing explains what it means or what happens if it's ignored, before a new player loses because of it.
- No step-through or pause available to non-debug players during their first game. Debug mode's spawn-pause (`S` key) exists but is explicitly developer/QA tooling per `specs/DEBUG.md`, not a player-facing feature.

**Post-game / repeat sessions**
- `GameOverScreen.tsx` shows score and week reached but no "what went wrong" detail — the message is a generic "A station overflowed" with no identification of which station or replay/highlight of the moment it happened.
- No tips or difficulty ramp-down offered after a fast early loss (e.g. game over within the first Week).
- No tracking of session count (1st vs. 2nd vs. 50th game), so there's no way to progressively fade out hints as a player demonstrates competence.

**Open questions to resolve before implementing**
- One-time scripted tutorial (forced modal steps + a guided first connection) vs. always-available contextual first-occurrence toasts vs. some hybrid?
- Should hints ever reappear for returning players, or show only once per browser ever (requires local storage — see Persistence)?
- Should a first-time session use an easier spawn/decay curve than `core/progression.md`'s default, or should difficulty be identical from game one?
- Is a "skip tutorial" control needed, and if so, does it gate just the pre-game modal or also in-canvas first-occurrence hints?
- No instrumentation exists to learn where new players actually get stuck or quit (ties into the empty Analytics section above) — without that data, any FTUE design is a guess rather than something validated.

## Known Gaps Already Tracked

See `specs/themes/metro.md` §10 "Known Divergences from Original Mini Metro" for the baseline list (delivery choice, line deletion, mobile support, sound, high scores, etc.) — cross-check before duplicating work here.

## Bugs (found in review, not yet fixed)

Found during a full code-vs-spec pass. Not fixed — flagged here to revisit later. See `themes/metro.md` §11 Bug Log for the format once these get addressed (id, symptom, root cause, rule fix).

- **Dead reachability function duplicates a bug that was already fixed.** `canReach` in `src/logic/passengers.ts:26-52` is an unbounded BFS across all connected lines/stations and is never called anywhere — superseded by `canReachAhead` in `trains.ts`, which added the one-hop + anti-bounce rules specifically to fix bug B5 (see `themes/metro.md` §11). Harmless while unused, but reintroducing it would reopen the passenger-bounce bug.
- **`redistributeTrains` float-precision edge case.** `src/logic/trains.ts:216-238` — if `cumLen + segLen` never quite reaches `targetDist` on the final segment due to floating-point drift, that train is never repositioned, left at its previous spot. Rare, low severity.

Fixed since the last pass (see `themes/metro.md` §11 Bug Log for B8): the "game over can never trigger" gate, the unused `DeliveryModal` component (repurposed into `MilestoneChoiceModal`), and the HUD toast opacity formula exceeding 1.
