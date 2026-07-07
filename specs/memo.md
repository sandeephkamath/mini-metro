# Future Considerations

Running list of things not yet decided or implemented. Not a spec — just a backlog to work through and turn into real spec entries (`specs/`) once decided.

See also `specs/research/mini_metro_original_analysis.md` — gameplay analysis of an original Mini Metro playthrough (spawn/upgrade pacing, overflow warning UX, route editing/deletion), referenced from a few items below. And `specs/research/mini_metro_original_analysis_2_ui_timing.md` — a second pass with captions/commentary as source, focused on UI/timing specifics (what exactly triggers the overflow indicator, pausable animations, player-facing speed controls, line bend geometry, the confirmed line-deletion gesture); includes reference screenshots in `specs/research/reference_screenshots/nyc_analysis/`.

---

## Styling / Visual Polish

- Only one visual theme exists (Metro). Decide if alternate themes (e.g. water pipes, blood vessels, airline routes) are worth building on top of `core/logic.md`.
- Station spawn now fades/scales in (matching the original's shrinking-gray-halo look, `research/mini_metro_original_analysis_2_ui_timing.md` §2). Passenger boarding/alighting and new-train appearance now animate too (queue-in fade/scale, board/deliver ghost flourishes, train spawn fade/scale — `themes/metro.md` §5 config values + §7 items 8–9). Remaining un-animated pop: a Depot Carriage attaching to a Train adds its carriage box instantly.
- No sound effects or music (noted in metro.md divergences).
- Canvas is a fixed 800×600 — no responsive scaling for different window/screen sizes.
- Overflow warning is a pulsing red ring — consider whether near-capacity states need earlier/gentler visual cues. The original's global cue (a HUD-corner element turning solid red while *any* station is in overflow risk, `research/mini_metro_original_analysis_2_ui_timing.md` §1) is implemented: the HUD's day-of-week clock badge recolors solid red while any Station is at risk and reverts once none are (`themes/metro.md` §7 item 6, `HUD.tsx` ClockBadge) — placed on the clock badge rather than the pause button, but the same mechanic. Considered and resolved; nothing further planned here unless the per-station visual itself changes.
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

Touch input and responsive sizing are now implemented (`useMouseInput.ts`, `GameCanvas.tsx` — see `themes/metro.md` §6 Camera Controls / §6.1 Responsive Presentation for the full rules):
- Single-finger touch is a full equivalent of the mouse for drawing/extending Lines and panning.
- Two-finger pinch zooms (centered on the pinch midpoint); two-finger drag pans; both combine in one gesture.
- The whole 800×600 canvas+HUD stage scales to fit any viewport, never scaling up past native size. On a portrait phone specifically, it rotates 90° before scaling to actually fill the screen, rather than a plain contain-fit that would otherwise leave most of a tall narrow screen empty (`themes/metro.md` §6.1) — confirmed necessary via real-device testing (a plain scale-to-fit alone left the game tiny and letterboxed on an actual phone in portrait).
- Real-device testing also surfaced that the drag-to-connect-Lines target radius was too tight for touch on a scaled-down screen — releasing near-but-not-exactly-on a Node would silently fail to connect. Fixed by widening (and using nearest-not-first-found for) the drop-tolerance specifically on drag release — see `core/logic.md` §4.

Still a real gap, not addressed: the internal canvas resolution stays fixed at 800×600 regardless of `devicePixelRatio` — on a high-DPI phone the game renders correctly-scaled but not at native sharpness (no supersampling). There's also no portrait-specific HUD layout — the rotate-to-fill above means the existing HUD just rotates along with everything else rather than being redesigned for a tall narrow screen.

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
- No edge auto-pan while drawing: dragging a line to the screen edge doesn't scroll the camera, so a connection between two stations that don't fit in view at once requires zooming out first. Mitigated by the capped spawn area + contiguous-growth rule (`core/logic.md` §5, 2026-07-06) keeping the network compact, but the original does pan when you drag to the edge — worth adding if far connections still feel awkward on mobile.

## Persistence

- No save/resume — closing the tab loses all progress.
- No high score storage. Best Level Reached and Picture Collection progress are now spec'd (`core/meta_progression.md`) as persistent values — local storage is the obvious backing store, but this isn't implemented in code yet.

## Onboarding / UX

- No pause functionality outside of debug mode's speed controls. The original treats pause/normal/fast-forward as three always-visible, player-facing buttons, not debug-only tooling — confirmed directly (not inferred) via `research/mini_metro_original_analysis_2_ui_timing.md` §3, including a skilled player routinely using fast-forward through quiet stretches.
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

**Resolved**: the tutorial-style question (scripted vs. contextual vs. hybrid) is settled in favor of a **scripted sandbox tutorial**, now spec'd in `specs/TUTORIAL.md` — guided first Line, scripted board/ride/deliver, and a can't-fail overflow rescue, with a Skip control on every step. For now it is debug-triggered only (`T` in debug mode).

**Still open**
- Player-facing entry points for the tutorial: a home-screen Tutorial button, and/or auto-running it on the first-ever session (needs "has played before" persistence — see Persistence section above).
- Should hints/tutorial ever reappear for returning players, or show only once per browser ever (requires local storage — see Persistence)?
- Should a first-time session use an easier spawn/decay curve than `core/progression.md`'s default, or should difficulty be identical from game one?
- Contextual first-occurrence toasts for events the scripted tutorial can't cover live (first real Weekly Upgrade choice, first Line unlock) — worth adding on top of the scripted tutorial, or is the wrap-up step's mention enough?
- No instrumentation exists to learn where new players actually get stuck or quit (ties into the empty Analytics section above) — without that data, any FTUE design is a guess rather than something validated.

## Known Gaps Already Tracked

See `specs/themes/metro.md` §10 "Known Divergences from Original Mini Metro" for the baseline list (delivery choice, mobile support, sound, high scores, etc.) — cross-check before duplicating work here. Line deletion is no longer a gap: implemented on the `mini-metro-original-parity` branch using the confirmed original gesture (press/hold the line's own color swatch in the bottom HUD legend — it grows into a red circle with an X, hold to completion deletes, release early cancels — see `research/mini_metro_original_analysis_2_ui_timing.md` §5). Still open: a Creative Mode continuation option, confirmed on the Game Over screen in two separate research-video sessions (`research/mini_metro_original_analysis_2_ui_timing.md` §7), now also tracked in `metro.md` §10. Pausing to edit is a real, repeated skilled-player technique — now surfaced as a real player-facing affordance rather than debug-only, per the pause/fast-forward note above.

## Bugs (found in review, not yet fixed)

Found during a full code-vs-spec pass. See `themes/metro.md` §11 Bug Log for the format once these get addressed (id, symptom, root cause, rule fix). Currently empty — everything from the last pass is resolved or assessed:

- **Dead `canReach` function** — deleted (see Bug Log B14).
- **`redistributeTrains` float-precision edge case** — assessed 2026-07-06 as unreachable, no fix needed: `targetDist` maxes out at `total * (N-1)/N`, a full segment-scale `total/N` short of `total`, while `cumLen + segLen` on the final segment equals `total` bit-for-bit (same `buildSegmentShape().length` values summed in the same order as `lineLength`). Float drift would need to overcome whole pixels, not epsilon — the "final segment never reached" branch cannot fire. No defensive code added, per the don't-guard-impossible-cases rule.
- **`weekly-upgrade.spec.ts` failing on `main`** — stale entry: the fix (pause passenger spawning + poll for week 5 instead of a fixed wait) landed with the B12 commit (`c87b851`, 2026-07-06). Re-run confirmed green on `main`.

Fixed since the last pass (see `themes/metro.md` §11 Bug Log for B7/B8/B14): the debug-panel/HUD overlap (panel now starts below the HUD bar), the "game over can never trigger" gate, the unused `DeliveryModal` component (repurposed into `MilestoneChoiceModal`), the HUD toast opacity formula exceeding 1, and the dead `canReach` function.
