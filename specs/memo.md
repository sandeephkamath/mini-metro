# Future Considerations

Running list of things not yet decided or implemented, triaged into what's planned for production and what's genuinely deferred. Not a spec — just a backlog to work through and turn into real spec entries (`specs/`) once decided.

See also `specs/research/mini_metro_original_analysis.md` — gameplay analysis of an original Mini Metro playthrough (spawn/upgrade pacing, overflow warning UX, route editing/deletion), referenced from a few items below. And `specs/research/mini_metro_original_analysis_2_ui_timing.md` — a second pass with captions/commentary as source, focused on UI/timing specifics (what exactly triggers the overflow indicator, pausable animations, player-facing speed controls, line bend geometry, the confirmed line-deletion gesture); includes reference screenshots in `specs/research/reference_screenshots/nyc_analysis/`.

---

## Planned for Production

Items expected to land before or shortly after a real public release. Every other item that was here (Monetization's ad "+" affordance, Analytics' Crashlytics, Mobile/Responsive's background-accurate Game Clock and the Android production keystore, Onboarding/UX's hidden-by-default speed controls, and the two tutorial gaps) landed 2026-07-12 — see the matching entries under Reference below. Collectibles is deliberately left here, out of scope for that pass.

### Collectibles

- **Content is Firestore-backed, not build-time-baked** (`themes/metro.md` §9.3.1, decided 2026-07-08): each city is a Firestore document (dataset + Required Progress), so new cities or threshold tweaks ship without an app update. This is public read-only content — no player identity needed, so unlike the Leaderboard it works on web *and* Android alike. **Not yet implemented in code**: no fetch/cache module exists yet (no `src/firebase/pictures.ts`-equivalent, unlike Remote Config's `remoteConfig.ts`), and `firestore.rules` has no rule for a pictures/cities collection yet — everything currently runs on the bundled fallback pool below. Deliberately not built yet: standing up live-fetch machinery for a collection with no real content in it yet is premature (see [[docs_lag_behind_implementation]]-adjacent lesson — build the thing once there's something real for it to serve). Do this once real per-city data entry is actually ready to go live.
- **Firestore document shape, decided 2026-07-11**: mirrors `PictureCityData` directly (`themes/metro.md` §9.3.1) — no separate encoding invented. **Real dependency, still open**: uploading real documents to the live `pictures` collection (and deploying a matching public-read rule in `firestore.rules`) needs Firebase console/CLI write access this session didn't have (see [[stale_remote_config_snapshot]] for the same access wall hit elsewhere) — left for the user to do whenever the live-fetch module above gets built.
- The Collectibles Screen's "locked" treatment for upcoming, not-yet-current Pictures (blurred render vs. a generic silhouette/"???" placeholder, `home_screen.md` § Collectibles Screen) was explicitly left open until the rendering pipeline existed to judge the real look against — that pipeline is now live, so this decision is unblocked and ready to make.


---

## Future Scope

Deferred — revisit with real usage data, player feedback, or when priorities shift, not preemptively.

### Styling / Visual Polish

- No dark mode.

### Audio

- Still open / deferred, not blocking anything shipped:
  - No Line-deleted cue (only Route *Committed* has one) — deletion is a hold-gesture with its own visual feedback already; revisit if it feels audio-silent in practice.
  - No Train departs/arrives or Passenger boards (only delivery) — considered too frequent/noisy for the "soothing" brief; revisit if playtesting wants more train-level ambience.
  - No independent volume sliders (just on/off) for either Music or Sound. Revisit if players want finer-grained control.
  - Assets are synthesized `.wav` files, not licensed/recorded/commissioned — swapping in different audio later is a one-file-per-cue change (`src/config/audioConfig.ts`), see `metro.md` §13 "Asset files & swapping".

### Scoring

- No distinction between a short trip and a long multi-transfer delivery — consider whether harder deliveries should score more.
- No combo/streak mechanic.

### Levels / Maps

- Single fixed map only. Original Mini Metro has multiple cities with different layouts and constraints (rivers, tunnels). Explicitly deferred — no obstacle/river mechanic for MVP; revisit only if a single map's procedural variety proves insufficient.

### Collectibles

- Picture 1's fallback threshold (20 Week-units), the growth rate (1.5), and the animated Game-Over Reveal (`themes/metro.md` §9.4) are all new as of 2026-07-08 — placeholders, not playtested. Current values are launch-safe; tune once real completion-rate data exists.
- **Still not yet decided**: whether an admin tool/script is worth building for authoring entries vs. editing Firestore documents directly via the console — left to implementation time, same as Remote Config's override document.
- **Naming, not yet decided**: "Collectibles" (the home-screen icon label, the Collectibles Screen title, and the term used throughout `themes/metro.md` §9.3/`home_screen.md`) reads as a generic catch-all rather than something specific to what this feature actually is — a collection of real transit-map Pictures revealed over time. Consider a more evocative name (leaning on "Picture"/"Map"/city-collection framing rather than the generic "Collectibles" label) — a pure rename, no behavior change, but touches the button label, screen title, and every spec reference to the term.

### Monetization

- **Not yet decided**: how continue/bonus economics should be tuned once real usage data exists, and whether the On-Demand Bonus Request needs any soft rate-limit (e.g. a short cooldown) once real ads are in play — deliberately left uncapped for now per the spec.

### Analytics

- **Deliberately out of scope**: no send-trigger logic exists yet for the registered push tokens — no Cloud Function, no re-engagement notification content/timing/copy. Registration only makes a device reachable; revisit once there's a concrete notification use case worth building (core/analytics.md §3 explicitly excludes this).
- **Not yet decided**: whether events should ever feed a dashboard/backend beyond Firebase's own console, and whether the taxonomy needs per-station or per-line granularity (e.g. distinguishing which Station caused a game over) — deferred until real usage data exists to justify it.

### Camera / Zoom

- Once the player manually zooms or pans, the automatic keep-everything-in-view behavior (`core/logic.md` §5) is permanently disabled for the rest of the session — there's no "recenter" or "reset view" control to hand control back to auto-fit. Revisit if this proves annoying in practice (e.g. after an accidental scroll).
- No on-screen zoom indicator (percentage or slider) — only implicit visual feedback from Station/Line size changing.
- No edge auto-pan while drawing: dragging a line to the screen edge doesn't scroll the camera, so a connection between two stations that don't fit in view at once requires zooming out first. Mitigated by the capped spawn area + contiguous-growth rule (`core/logic.md` §5, 2026-07-06) keeping the network compact, but the original does pan when you drag to the edge — worth adding if far connections still feel awkward on mobile.

### Leaderboard

- **Follow-up, not urgent**: adding the `firebase` package pushed the production JS bundle from ~277KB to ~847KB (gzip ~85KB → ~254KB), past Vite's 500KB chunk-size warning. **Investigated 2026-07-12 and found less "quick" than this note originally assumed**: `logGameEvent` (Analytics) fires from ~17 call sites across `useGameState.ts`/`GameCanvas.tsx`/`useMouseInput.ts` on nearly every player action, not just on first sign-in/Leaderboard use, and `gameConfig.ts`'s `CONFIG` object is built around Remote Config overriding it at module-load time — both used from the very first frame, not deferred. A real dynamic `import()` would mean either queuing/buffering analytics events until the module resolves (risk of dropped events on a short session) or layering async-on-top-of-async onto Remote Config's own fetch, touching config resolution nearly everything reads from early. Deliberately not attempted now given that risk for a bundle-size-only win — if this gets revisited, scope it to just the Leaderboard's own Firestore/Auth code (genuinely sign-in-gated) rather than the whole `firebase` import.
- **No server-side score validation beyond Firestore Security Rules.** Accepted deliberately for now (move-fast philosophy) — revisit only if leaderboard abuse actually shows up after launch, not preemptively.

### Remote Config

- **Not yet decided**: no admin UI for editing the override document — same "edit directly via Firebase console" posture as the Picture Collection dataset.

### Onboarding / UX & FTUE

**Pre-game**
- Nothing explains what a "Week" is, that Lines unlock as more Stations appear while Trains/Carriages/Risk Timer bonuses come from the Weekly Upgrade, or that an overflowing Station only has a limited Risk Timer window before it's fatal.
- No easier/slower pacing option for new players. First-timers get the same spawn-rate decay curve (`core/progression.md`) as an experienced player on run 50.

**First minute of gameplay**
- No guided first action beyond what the scripted tutorial already covers. Nothing highlights or pulses stations outside of the tutorial flow, and no in-canvas affordance (arrow, glow, cursor hint) exists for a returning player who skipped it.
- The only in-game overflow signal is the pulsing red ring (see Styling section) — nothing explains what it means or what happens if it's ignored, before a new player loses because of it.

**Post-game / repeat sessions**
- `GameOverScreen.tsx` names which Station overflowed, by shape, but there's still no replay/highlight of the moment it happened, or *why* it filled up (which line/passenger volume caused it) — a bigger feature, left for later.
- No tips or difficulty ramp-down offered after a fast early loss (e.g. game over within the first Week).
- No tracking of session count (1st vs. 2nd vs. 50th game), so there's no way to progressively fade out hints as a player demonstrates competence.

**Still open**
- Should a first-time session use an easier spawn/decay curve than `core/progression.md`'s default, or should difficulty be identical from game one?
- No instrumentation exists to learn where new players actually get stuck or quit (ties into the empty dashboard question above) — without that data, any FTUE design is a guess rather than something validated.

---

## Reference — Decided / Implemented / No Open Items

Historical context and fully-resolved items, kept for continuity. Not backlog — nothing here needs planning.

### Styling / Visual Polish

- Station spawn now fades/scales in (matching the original's shrinking-gray-halo look, `research/mini_metro_original_analysis_2_ui_timing.md` §2). Passenger boarding/alighting, new-train appearance, and Depot Carriage attachment now all animate too (queue-in fade/scale, board/deliver ghost flourishes, train spawn fade/scale, carriage attach fade/scale — `themes/metro.md` §5 config values + §7 item 10). Nothing left un-animated in this list.
- Overflow warning is a pulsing red ring. The original's global cue (a HUD-corner element turning solid red while *any* station is in overflow risk, `research/mini_metro_original_analysis_2_ui_timing.md` §1) is implemented: the HUD's day-of-week clock badge recolors solid red while any Station is at risk and reverts once none are (`themes/metro.md` §7 item 7, `HUD.tsx` ClockBadge) — placed on the clock badge rather than the pause button, but the same mechanic. Considered and resolved.

### Audio

- Implemented 2026-07-11: Background Music (Menu Track for `home`/`gameover`, Session Track for `playing`) and six Audio Cues (Resource Delivered, Node Spawned, Route Committed, Milestone Event, Overflow Risk Started, Game Over), all procedurally synthesized — `core/logic.md` §7 (theme-neutral) and `themes/metro.md` §13 (concrete tracks/cues/config). See `src/audio/audioManager.ts`, `src/config/audioConfig.ts`, `scripts/generate-audio.mjs`.
- **Updated 2026-07-11**: replaced the single shared mute toggle with two independent Music/Sound toggles, moved out of the HUD and Home Screen's own icon row into a new Home Screen Settings screen (`home_screen.md` § Settings) — a player reported Menu Track music effectively never being heard in practice (their first gesture was almost always the Play button itself, switching the track before the gesture-gated unlock ever became audible). Fixed by attempting muted autoplay immediately rather than waiting for a gesture, with the first gesture only unmuting whatever's already playing — `core/logic.md` §7, `metro.md` §13 "Autoplay/gesture handling". Settings also gained a Privacy Policy link (`metro.md` §5 `Privacy Policy URL`, blank/omitted until a real URL is filled in).

### Scoring

- Current scoring is flat: +1 per delivered passenger, no multipliers or bonus scoring.
- Best Weeks Survived persistence is implemented (`src/storage/metaProgression.ts`, `core/meta_progression.md` §2/§6, `themes/metro.md` §9.2/§9.5) — shown on the Home Screen and the Game Over screen.

### Levels / Maps

- Long-term progression is specified end-to-end and **implemented**, including persistence and home-screen UI: `specs/core/meta_progression.md` (theme-neutral Weeks-Survived/Best-Weeks-Survived/Collectible-Reward rules, §3 Minimum Session Contribution guarantee, §6 Persistence), `specs/themes/metro.md` §9 (concrete Picture Collection values + §9.5 localStorage persistence via `src/storage/metaProgression.ts`), and `specs/themes/home_screen.md` (Best Weeks Survived / Collectibles Screen entry point). Progression is measured by Weeks Survived (the existing week/day clock), not a separate Level counter — Milestone Events still fire and still grant bonuses, but no longer double as a meta-progression metric. Still pending: the real per-city Picture datasets — see Collectibles under Planned for Production.

### Collectibles

- Content direction and production method are both decided: Pictures depict real-world transit systems (London Underground, Tokyo Metro, NYC Subway, Paris Métro, ...), **procedurally rendered** from a curated per-city station/line dataset using the game's existing line/station-shape drawing code — not static image files, not commissioned/AI-generated art (`themes/metro.md` §9.3, decided 2026-07-08 in favor of avoiding any external art-asset pipeline).
- **Bundled fallback pool expanded 2026-07-11**: 2 → 4 cities (London, Paris, Tokyo, New York City — the exact set named in `themes/metro.md` §9.3's own example list), `src/data/pictureCities.ts`. Same hand-authored-schematic approach as the original two (real official line colors and real station names, simplified/non-surveyed topology) — not a licensed reproduction. London stays pool index 0 since it's the pre-seeded `ZERO_STATE` Picture 1 (`themes/metro.md` §9.5); Tokyo/NYC were appended, not inserted, so existing saved progress against London/Paris is unaffected.

### Monetization

- Spec'd end-to-end (`core/monetization.md`, `themes/metro.md` §4.2, `DEBUG.md` § Debug Ad Availability), decided 2026-07-08: an on-demand, uncapped Rewarded-Ad bonus request, and a Game-Over Continue (ad-gated true continue that rescues a Node Overflow in place, limited to a configurable Continue Limit per session — metro starts at 1). The old "More Time" Milestone bonus kind (Grace Duration increase) is removed entirely as part of this — Risk Timer duration is now fixed for the whole session.
- **Ad Provider, decided 2026-07-10**: real **AdMob** rewarded ads on Android (via the Capacitor scaffold, `@capacitor-community/admob`), permanently gated to Android only since AdMob has no web SDK. Web permanently uses the **Simulated Ad** (a fixed-duration placeholder that always succeeds) — not a stand-in awaiting replacement, the actual web Ad Provider going forward. Real AdMob App ID/ad unit ID are supplied via build config (Android build-type manifest placeholders for the App ID, a `VITE_ADMOB_REWARDED_AD_UNIT_ID` env var for the ad unit ID), falling back to Google's public test IDs until the user's real ones are configured — same env-var pattern as `src/firebase/config.ts`.
- **Implemented 2026-07-12**: a dedicated "+" badge on a ×0 Depot Train/Carriage button when an Ad Provider is available (`themes/metro.md` §4.2, `HUD.tsx`'s `AdBonusBadge`) — purely visual, the underlying click handling (`handleCarrierClick`/`handleCarriageClick`) was already correct.

### Analytics

- **Implemented** (`core/analytics.md`, `themes/metro.md` §12, decided 2026-07-11): Firebase Analytics event logging for session start/end, milestone/ad/continue/tutorial/leaderboard moments (full taxonomy in `themes/metro.md` §12.1), plus Android-only FCM device token registration (`themes/metro.md` §12.2, `@capacitor/push-notifications` + a `pushTokens` Firestore collection). No consent prompt — tracks by default, matching the Leaderboard/Remote Config trust-client posture.
- **Real dependency, satisfied 2026-07-11**: Google Analytics was already linked to the `trainpuzzle-lovoctech-5a750` Firebase project (confirmed via a real `measurementId`, `G-6P94S5E2RR`, now in `.env.local`) — events are live, not waiting on setup. A fresh clone without `.env.local` still falls back to `REPLACE_ME` and every event call silently no-ops, same fail-gracefully posture as everything else Firebase-backed here.
- **Implemented 2026-07-12**: Firebase Crashlytics on Android (`android/build.gradle` classpath + `android/app/build.gradle` plugin/dependency, gated on the same `google-services.json`-exists check as the rest of Firebase) and a web-side `js_error` Analytics event (`src/firebase/crashReporting.ts`, capped at 10/session) for unhandled errors/rejections, wired at app startup (`src/main.tsx`) — `themes/metro.md` §12.3.

### Mobile / Responsive

- **Implemented 2026-07-12**: the Game Clock now keeps advancing while the tab/app is backgrounded, catching up by the exact real elapsed wall-clock duration on resume, no cap (`core/logic.md` §6). `useGameLoop.ts` no longer resets its delta-time baseline on `visibilitychange` — RAF's own timestamp is already wall-clock-accurate once that reset is removed, so no separate `Date.now()`-based timing was needed. Since `tick()` still caps any single call to `CONFIG.MAX_DT` (100ms, an existing frame-drop safeguard unrelated to backgrounding), a large gap is drained through a loop of capped steps rather than one call that would've silently discarded everything past the first 100ms.

#### Android Packaging (decided 2026-07-09: Capacitor)

Game ships as an Android app via **Capacitor** — wraps the existing Vite build in a native WebView shell, reuses `src/render/` and all game logic untouched, produces a real Play Store APK/AAB. Web app remains the fully supported, undiverged primary target; the `android/` native project is a packaging layer on top, not a fork.

App ID: `com.lovoctech.trainpuzzle`. Display name: "Train Puzzle".

Ruled out: full native Android (Kotlin/Java) rewrite, Trusted Web Activity, and PWA-only install — not feasible/not being considered. Also ruled out over Capacitor: React Native + `react-native-webview` (functionally equivalent, extra RN overhead for no gain) and React Native + native rendering e.g. `react-native-skia` (requires rewriting `src/render/` entirely and maintaining two divergent renderers going forward). Revisit only if a concrete reason to prefer React Native shows up later (native perf requirement, RN plugin ecosystem need, business reason to standardize on RN) — not preemptively.

Real dependency: an Android Studio / Android SDK install is required to actually build or run the `.apk` locally (Capacitor's Gradle wrapper needs it); scaffolding the `android/` project itself does not.

**Implemented 2026-07-12**: a production/release keystore (`android/release.jks`, gitignored, generated via `keytool`, 2048-bit RSA, 10000-day validity) plus a matching `signingConfig` in `android/app/build.gradle`, reading store/key path/passwords from a new gitignored `android/keystore.properties` (`android/keystore.properties.example` documents the shape, same pattern as `local.properties.example`) — falls back to no signingConfig at all (an unsigned but still-buildable release) if that file is absent, same fail-gracefully posture as the AdMob/Play Games values. Verified end-to-end: `./gradlew assembleRelease` succeeds and `apksigner verify --print-certs` on the resulting APK confirms it's signed with the new keystore's certificate, not the debug one. CI (`.github/workflows/android-apk.yml`) is deliberately untouched — still `assembleDebug`-only, still signed with the stable debug keystore for Play Games SHA-1 continuity (`themes/metro.md` §11 B28); standing up a release CI job and an actual Play Console upload key is a separate, not-yet-done step. The real keystore file and its password were generated locally and are not committed anywhere — the user is responsible for backing both up somewhere durable outside the repo (a password manager attachment or secure cloud storage); losing them means the app can never be updated under the same Play Store listing again.

Touch input and responsive sizing are implemented (`useMouseInput.ts`, `GameCanvas.tsx` — see `themes/metro.md` §6 Camera Controls / §6.1 Responsive Presentation for the full rules):
- Single-finger touch is a full equivalent of the mouse for drawing/extending Lines and panning.
- Two-finger pinch zooms (centered on the pinch midpoint); two-finger drag pans; both combine in one gesture.
- The whole 800×600 canvas+HUD stage scales to fit any viewport, never scaling up past native size. On a portrait phone specifically, it rotates 90° before scaling to actually fill the screen, rather than a plain contain-fit that would otherwise leave most of a tall narrow screen empty (`themes/metro.md` §6.1) — confirmed necessary via real-device testing (a plain scale-to-fit alone left the game tiny and letterboxed on an actual phone in portrait).
- Real-device testing also surfaced that the drag-to-connect-Lines target radius was too tight for touch on a scaled-down screen — releasing near-but-not-exactly-on a Node would silently fail to connect. Fixed by widening (and using nearest-not-first-found for) the drop-tolerance specifically on drag release — see `core/logic.md` §4.

**Resolved 2026-07-11**: the canvas backing store is now supersampled by `devicePixelRatio` (`GameCanvas.tsx`'s canvas width/height attrs, `useGameLoop.ts`'s per-frame `ctx.setTransform`, `themes/metro.md` §6.1) — the CSS box and every coordinate the game reasons about (camera, world positions, click/tap mapping) stay in the same units as before, only the rasterization is denser. `useMouseInput.ts`'s `getCanvasPos` was updated to project onto `state.viewport` instead of the canvas element's own `width`/`height`, since those two stopped being equal once the backing store outgrew the CSS box.

**Decided, not a gap**: no portrait-native HUD layout is planned — landscape is the game's required/intended orientation on phones, not just the default. The rotate-to-fill behavior above (spin the whole landscape design 90° so it still fills a phone screen if the player happens to be holding it in portrait) is the accepted handling for that case, not a stand-in for a "real" portrait redesign.

**Resolved 2026-07-11**: the rotate-to-fill behavior was silently mismatched with dialogs (Game Over, Collectibles, Exit confirm) that deliberately stay upright (B19) — on a real Android phone held in portrait, the rotated board and the upright dialog visibly disagreed about which way was "up" (`themes/metro.md` §11 B20). Fixed at the root rather than patched per-dialog: Android's Activity is now locked to `sensorLandscape` (`android/app/src/main/AndroidManifest.xml`), so the device is simply never presented to the WebView in portrait on Android and the whole rotation system (dialogs included) never activates there. Only the web build still needs §6.1's rotate-to-fill fallback, for a portrait browser window — no OS-level orientation lock is available for a plain browser tab.

### Persistence

- No save/resume — closing the tab loses all progress. In-session state is deliberately never persisted (`core/meta_progression.md` §6) — only meta-progression is.
- Best Weeks Survived and Picture Collection progress (Collection size + current Picture's Accumulated Progress) are persistent values, backed by `localStorage` under a single key — implemented (`src/storage/metaProgression.ts`, `core/meta_progression.md` §6, `themes/metro.md` §9.5).
- "Has the Tutorial ever been shown" is a separate `localStorage` flag (`TUTORIAL.md` §8, `src/storage/tutorialSeen.ts`), implemented 2026-07-11 — deliberately not folded into the meta-progression key above since it's onboarding state, not survival/collection progress.

### Leaderboard

- Implemented in code (`src/firebase/`, `src/leaderboard/client.ts`, `src/native/playGamesLeaderboard.ts`, `src/hooks/useLeaderboard.ts`, `src/components/LeaderboardScreen.tsx`) against `core/meta_progression.md` §7–§8, `themes/metro.md` §9.6, `themes/home_screen.md` § Leaderboard — global ranking by Best Weeks Survived, Top 50 + own rank, shown on the home screen and after a session ends. Identity and backend are two different services, both fully implemented: Google Play Games Services for identity on Android (silent, automatic, via a custom Capacitor plugin — `android/app/src/main/java/.../PlayGamesLeaderboardPlugin.java`), the interim Firebase "Sign in with Google" popup for identity on web, and Firebase (Firestore) for storage/ranking on both — no dedicated server. `src/leaderboard/client.ts` dispatches every read/write to whichever SDK matches the active identity source (native Firebase Auth session on Android via `PlayGamesAuthProvider`, JS SDK everywhere else), so callers never branch on platform themselves.
- **Real dependency, satisfied 2026-07-09**: a real Firebase project (`trainpuzzle-lovoctech-5a750`, under `lovoctech@gmail.com`) exists — Firestore database created, `firestore.rules` deployed, a web app registered, and Google Sign-In enabled as an Auth provider (verified via Firebase's `accounts:createAuthUri` REST endpoint returning a real OAuth URL). The real SDK config lives in `.env.local` (gitignored via `*.local`, never committed — `.env.example` documents the shape) and is read by `src/firebase/config.ts` via `import.meta.env.VITE_FIREBASE_*`, falling back to `REPLACE_ME` placeholders if that file is absent so a fresh clone without it still boots safely. Anyone else working on this repo needs their own `.env.local` — ask for the values or set up a separate project.
- **Production identity (Play Games Services), implemented**: landed in `e791da1` ("Integrate real Google Play Games Sign-In on Android") — a real Capacitor plugin, not a stand-in. Console-side setup (Play Console API access, OAuth client, Testers list, the Firestore/Firebase-console steps, and needing a Play-Store-flavored AVD or a real device to actually test Play Games sign-in, since a plain Google-APIs emulator image doesn't have Play Games installed) is a one-time, already-done project-setup cost, not an open code task.
- Rank query is decided: `getCountFromServer` (Firestore's aggregation-query API) counting players with a strictly higher score, no dedicated server.
- Score-integrity check lives entirely in `firestore.rules`: rejects a submission that regresses the stored value or falls outside `[0, 100000)` — the client (`src/firebase/leaderboard.ts`) never compares against the previous value itself, per spec.
- Both platforms see a Leaderboard once signed in — web via the interim Google Sign-In popup, Android via automatic Play Games sign-in (`metro.md` §9.6). The only permanent asymmetry is *how* identity is obtained, not whether the Leaderboard itself appears.

### Remote Config

- Implemented in code (`themes/metro.md` §5.1): every `CONFIG` key (`src/config/gameConfig.ts`) is overridable from a single public Firestore document (`config/gameConfig`). The fetch (`src/firebase/remoteConfig.ts`) starts in the background the moment the module first loads — the home screen (`HomeScreen.tsx`) renders immediately and doesn't wait on it. If the player clicks Play before it resolves, the Play control is replaced in place by a themed spinner ("STARTING…") until the fetch resolves or its timeout (`CONFIG.REMOTE_CONFIG_FETCH_TIMEOUT_MS`, 3000ms default) elapses, then the game starts on whatever config that produced. `firestore.rules` has a public-read/no-write rule for the `config` collection, ready to deploy once a project exists.
- **Real dependency, satisfied 2026-07-09**: same real project as the Leaderboard now (`trainpuzzle-lovoctech-5a750`). Confirmed via the run-driver: clicking Play now enters `playing` within ~300ms against the real Firestore project, instead of riding out the full fetch timeout as it did against the placeholder — the themed in-place spinner (§ above) is now a rare edge case rather than the common path.

### Onboarding / UX & FTUE

- **Flipped 2026-07-12**: the HUD's Pause/Play/Fast-Forward control (`core/logic.md` §6, `themes/metro.md` §5) is now **hidden by default** (`CONFIG.PLAYER_SPEED_CONTROLS_ENABLED = false`), shown only when the build-time flag is explicitly turned on — a skilled player using fast-forward through quiet stretches, per `research/mini_metro_original_analysis_2_ui_timing.md` §3, is still the intended use once enabled, just no longer on for everyone by default.
- **Flagged 2026-07-12**: the Game Over screen's "Continue in Creative Mode" button (`core/logic.md` §3, `themes/metro.md` §5) is now gated behind `CONFIG.CREATIVE_MODE_CONTINUE_ENABLED`, **off by default**. Same remote-config-overridable pattern as the config table generally (`themes/metro.md` §5.1) — flip it on for some/all sessions from the Firestore `config/gameConfig` document without a client release.
- The Game Over screen's corner close control asks for confirmation (Return / Cancel) before actually returning to `home`, so an accidental tap can't discard the run summary (`themes/metro.md` §8).
- Current onboarding: clicking Play on the home screen goes straight into a fresh run for a returning player (per `themes/metro.md` §8 / `home_screen.md` — the pre-game instructions modal that used to show three bullet hints was removed 2026-07-08 in favor of getting players onto the real board immediately), and the HUD carries no persistent hint text either (the small always-on corner text was removed the same day — it was static and easy to miss anyway).
- A first-ever session (tracked via `localStorage`, `TUTORIAL.md` §8) auto-starts the scripted Tutorial the instant Play is clicked, instead of dropping the player onto an empty board — implemented 2026-07-11. Returning sessions are unaffected and go straight into normal play.
- First real Weekly Upgrade choice and first Line unlock get a one-time contextual hint (`TUTORIAL.md` §9); first passenger spawn and first station nearing capacity fire identically for new and veteran players — the scripted tutorial already covers both of those live, so no separate hint was added for them.
- **Resolved**: the tutorial-style question (scripted vs. contextual vs. hybrid) is settled in favor of a **scripted sandbox tutorial**, now spec'd in `specs/TUTORIAL.md` — guided first Line, scripted board/ride/deliver, and a demonstrated (not player-performed) Overflow countdown, with a Skip control on every step. It auto-runs once per browser on the first-ever session (`TUTORIAL.md` §1, §8) and remains separately available via the debug `T` key for QA replay.
- **Implemented**: contextual first-occurrence hints for the two events the scripted tutorial only describes rather than walks through live — the first real Weekly Upgrade choice (extra line inside the choice popup) and the first Line unlock (a toast) — `TUTORIAL.md` §9. Each is a separate, lifetime-once `localStorage` flag.
- **Implemented**: a manual home-screen "Restart Tutorial" button for returning players (`TUTORIAL.md` §1, `home_screen.md` § Content) — auto-run is still strictly first-session-only (`TUTORIAL.md` §8), but this new entry point starts a fresh session with the Tutorial forced on regardless.
- **Implemented 2026-07-12**: the tutorial now teaches Line-extension (a new "Extend the Line" step injects a Station reachable from the existing Line's end, `TUTORIAL.md` §5 step 7) and Depot Train placement (a "Depot Train" step grants a Reserve Train and has the player use the real Depot button/canvas click, step 10) hands-on, closing both gaps above. Resolved the board-reset question in favor of a full reset: every tutorial exit (Skip, Escape/skip-safety, or natural Wrap-Up completion) now discards the whole board and returns to the exact same baseline a normal fresh game starts from (`TUTORIAL.md` §6, `useGameState.ts`'s `finishTutorial()`) — this changes prior behavior where the original tutorial's drawn Line and delivered Passenger used to persist into real play. Also fixed two bugs surfaced during implementation: a Station injected while the clock is held never played its spawn-in animation (fixed by not holding the clock during the new Extend-the-Line step, `src/logic/tutorial.ts`), and the Depot tray's selection handler was unconditionally suspended during any tutorial step, silently blocking the very interaction the new Depot Train step needs (fixed with a narrow carve-out for that step only, `GameCanvas.tsx`'s `depotSuspended`).

### Known Gaps Already Tracked

See `specs/themes/metro.md` §10 "Known Divergences from Original Mini Metro" for the baseline list (delivery choice, mobile support, sound, high scores, etc.) — cross-check before duplicating work here. Line deletion is no longer a gap: implemented on the `mini-metro-original-parity` branch using the confirmed original gesture (press/hold the line's own color swatch in the bottom HUD legend — it grows into a red circle with an X, hold to completion deletes, release early cancels — see `research/mini_metro_original_analysis_2_ui_timing.md` §5). Creative Mode is no longer a gap either, **implemented 2026-07-11** (`core/logic.md` §3 Creative Mode, `themes/metro.md` §8): a "Continue in Creative Mode" button on the Game Over screen resumes the exact same board with Node Overflow permanently unable to end the session again, without touching any already-recorded Best-Weeks-Survived/Leaderboard/Picture-progress result — confirmed on the Game Over screen in two separate research-video sessions (`research/mini_metro_original_analysis_2_ui_timing.md` §7). No separate "Continue in Endless" option was added (the 3rd menu item the original also has) — Creative Mode already covers "keep playing forever," and a second, subtly-different continuation mode didn't seem worth the added complexity; revisit if that distinction turns out to matter. Pausing to edit is a real, repeated skilled-player technique — now surfaced as a real player-facing affordance rather than debug-only, per the pause/fast-forward note above.

### Bugs (found in review, not yet fixed)

Found during a full code-vs-spec pass. See `themes/metro.md` §11 Bug Log for the format once these get addressed (id, symptom, root cause, rule fix). Currently empty — everything from the last pass is resolved or assessed:

- **Dead `canReach` function** — deleted (see Bug Log B14).
- **`redistributeTrains` float-precision edge case** — assessed 2026-07-06 as unreachable, no fix needed: `targetDist` maxes out at `total * (N-1)/N`, a full segment-scale `total/N` short of `total`, while `cumLen + segLen` on the final segment equals `total` bit-for-bit (same `buildSegmentShape().length` values summed in the same order as `lineLength`). Float drift would need to overcome whole pixels, not epsilon — the "final segment never reached" branch cannot fire. No defensive code added, per the don't-guard-impossible-cases rule.
- **`weekly-upgrade.spec.ts` failing on `main`** — stale entry: the fix (pause passenger spawning + poll for week 5 instead of a fixed wait) landed with the B12 commit (`c87b851`, 2026-07-06). Re-run confirmed green on `main`.

Fixed since the last pass (see `themes/metro.md` §11 Bug Log for B7/B8/B14): the debug-panel/HUD overlap (panel now starts below the HUD bar), the "game over can never trigger" gate, the unused `DeliveryModal` component (repurposed into `MilestoneChoiceModal`), the HUD toast opacity formula exceeding 1, and the dead `canReach` function.
