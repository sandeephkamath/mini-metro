# Train Puzzle (Mini Metro Clone)

A Mini Metro-style resource-routing game — draw transit lines between stations, keep up with growing passenger demand, and survive as long as you can. Built with React, TypeScript, Vite, and HTML5 canvas; ships as a web app and, via Capacitor, a real Android app.

This repo doubles as a case study in AI-driven development: essentially the entire game — mechanics, UI, Firebase backend, Android packaging, and its own QA harness — was built by iterating with [Claude Code](https://claude.com/claude-code) rather than hand-written first and reviewed after.

## How this was built

Three things distinguish this project from a typical "AI helped me write some code" repo: a spec-first workflow that keeps the AI's changes anchored to a written source of truth, a running backlog the AI maintains itself, and a self-driving QA agent that plays the game headlessly.

### 1. Specs drive code, not the other way around

Every behavior change starts as an edit to a plain-English spec in `specs/` — no code, no pseudocode, just rules, tables, and state machines — *before* any implementation. The AI is instructed (`CLAUDE.md`) to treat this as a hard rule: implementing behavior first and updating the spec afterward as a rubber stamp is explicitly disallowed, because by the time code exists, the "spec update" just describes what got built instead of constraining what should be built.

Specs are layered so that theme-neutral rules never mix with metro-flavored specifics:

| Layer | File | Contains |
|---|---|---|
| Core mechanics | `specs/core/logic.md` | Nodes, Resources, Routes, Carriers, scoring, overflow — theme-neutral, no rendering references |
| Core pacing | `specs/core/progression.md` | Spawn-rate curves, unlock schedules — the tuning layer between fixed mechanics and concrete numbers |
| Core meta-progression | `specs/core/meta_progression.md` | Cross-session state: Weeks Survived, Collectibles, Leaderboard |
| Core monetization | `specs/core/monetization.md` | Ad-gated bonus/continue rules |
| Core analytics | `specs/core/analytics.md` | Event taxonomy, what's tracked and why |
| Theme mapping | `specs/themes/metro.md` | Maps core terms to Station/Line/Train/Passenger, every concrete config value, render order, screen states, and a running **bug log** |
| Theme (home) | `specs/themes/home_screen.md` | Pre-run / post-game-over screen |
| Dev tooling | `specs/DEBUG.md`, `specs/TUTORIAL.md`, `specs/testing.md` | Debug overlay, FTUE tutorial script, testing-agent spec |

Each real bug that got fixed is logged in `specs/themes/metro.md`'s Bug Log with symptom, root cause, and the rule that fixed it — so the AI (and anyone else) can check "has this class of bug already been hit" before re-introducing it.

### 2. A memo the AI reads before assuming a gap is unintentional

`specs/memo.md` is a running backlog the AI writes to as it works — undecided questions, deferred features, known trade-offs, and dated decisions ("Ad Provider, decided 2026-07-10: real AdMob on Android, Simulated Ad on web — not a stand-in awaiting replacement"). Before treating something as a bug or a missing feature, the AI is required to check here first, so it doesn't "fix" a gap that was already a deliberate, documented call. It's also where the AI records what's genuinely still open — e.g. bundle-size follow-ups, real-dependency setup steps that need human console/CLI access it doesn't have — instead of quietly leaving them undocumented.

### 3. A subagent that plays the game to find its own bugs

A dedicated `game-tester` subagent (`.claude/agents/game-tester.md`) drives an isolated Playwright harness under `testing/` — its own package, never touching `src/`. It:

- Runs fixed regression flows (desktop mouse + mobile touch/pinch/pan) defined against the specs, not against the implementation
- Free-form explores edge cases through the game's own Debug Mode (rapid restarts, mid-drag debug toggles, unusual gesture sequences)
- Classifies every mismatch as a Bug, a Known Divergence, an Already-Tracked issue, or a New Finding — cross-checking `specs/memo.md` so it doesn't re-report what's already a known, accepted gap
- Writes a report to `testing/reports/`, but never edits `src/` or `specs/` itself — promoting a finding into the spec or bug log stays a human (or main-agent) decision

This is what actually caught real, non-obvious bugs — like an instant-overflow condition gated on `< maxCapacity` making `> maxCapacity` unreachable, or a stale entity-ID counter living at module scope instead of inside game state — before they shipped.

## The game

Stations spawn on a map demanding different resource shapes (circle, triangle, square, ...). Draw routes between them, and carriers ferry resources automatically. Demand grows over time; stations that overflow past capacity risk ending the run. Survive as many in-game weeks as you can, unlock more routes and carriers as you go, and collect procedurally-rendered "Picture" rewards (real-world transit maps — London, Paris, Tokyo, NYC) that reveal gradually across sessions.

Beyond core mechanics, the game has:

- **Meta-progression**: persistent Best Weeks Survived and a Collectibles system, backed by `localStorage`
- **Monetization**: an on-demand rewarded-ad bonus and an ad-gated Game-Over Continue — real AdMob on Android, a Simulated Ad on web
- **Global leaderboard**: Google Play Games identity on Android, Google Sign-In on web, both backed by Firestore
- **Remote config**: every tunable value overridable from a Firestore document without an app update
- **Analytics**: session/milestone/ad/tutorial event logging via Firebase Analytics
- **A scripted first-time tutorial** and full mobile touch support (pinch-zoom, pan, responsive rotate-to-fill on phones)
- **Android packaging** via Capacitor, wrapping the same web build into a real Play Store APK/AAB with no forked renderer

## Getting Started

```bash
bun install
bun run dev
```

## Folder Structure

```
mini-metro/
├── specs/                       # Behavior specs — plain English, no code, drive all implementation
│   ├── core/                    # Theme-neutral: logic, progression, meta_progression, monetization, analytics
│   ├── themes/                  # Metro-specific: metro.md (config/render/bug log), home_screen.md
│   ├── research/                # Notes from analyzing the original Mini Metro (cited as evidence, not spec)
│   ├── DEBUG.md                 # Debug overlay and dev controls
│   ├── TUTORIAL.md              # Scripted first-time-user tutorial
│   ├── testing.md               # Spec for the automated testing agent/harness
│   └── memo.md                  # Running backlog of undecided/deferred work — check before assuming a gap
│
├── src/
│   ├── types/game.ts             # Shared types (GameState, Station, Train, MetroLine, Passenger, ...)
│   ├── config/                   # Tunable constants — gameConfig.ts, audioConfig.ts
│   ├── data/                     # Bundled fallback content (Collectible Picture city datasets)
│   │
│   ├── logic/                    # Pure game logic, no DOM/canvas access — gameLoop.ts is the main tick
│   ├── render/                   # Canvas drawing, one file per layer, composed by renderer.ts
│   ├── hooks/                    # React glue — game loop, state sync, mouse/touch input, audio, ads, leaderboard
│   ├── input/                    # Mouse/touch handlers
│   ├── components/               # Screens/UI (HomeScreen, HUD, GameCanvas, GameOverScreen, modals, ...)
│   │
│   ├── firebase/                 # Firestore/Analytics/Remote Config client
│   ├── leaderboard/               # Platform-dispatching leaderboard client
│   ├── native/                   # Capacitor plugin wrappers (Play Games, push notifications)
│   ├── ads/                      # Ad Provider abstraction (AdMob / Simulated Ad)
│   ├── audio/, storage/          # Audio playback + persisted settings/meta-progression/tutorial state
│   │
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
│
├── android/                     # Capacitor native project — packaging layer, not a fork of game logic
├── testing/                     # Isolated Playwright harness + reports — own package, never touches src/
├── .claude/agents/               # game-tester subagent definition
└── public/
```

## Orientation

Read specs in this order before changing game rules — full detail and rationale in `CLAUDE.md`:

1. `specs/core/logic.md` — theme-neutral mechanics
2. `specs/core/progression.md` — pacing/difficulty knobs
3. `specs/core/meta_progression.md` — cross-session progress (survival, collectibles, leaderboard)
4. `specs/core/monetization.md` — ad-gated bonuses/continues
5. `specs/themes/metro.md` — metro terminology, concrete config values, render order, screen states, bug log
6. `specs/themes/home_screen.md` — home/game-over screen
7. `specs/DEBUG.md` / `specs/TUTORIAL.md` — debug overlay and the scripted tutorial
8. `specs/testing.md` — testing-agent scope and flows
9. `specs/memo.md` — backlog of deferred/undecided work; check here before assuming a gap is unintentional

See `CLAUDE.md` for architecture constraints, conventions, and the full spec-first workflow rules.
