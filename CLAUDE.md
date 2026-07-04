# Mini Metro Clone

A Mini Metro-style resource routing game. Inherits stack/workflow defaults from the parent `../CLAUDE.md` (Bun, React + TS + Vite, Tailwind, Zustand, vibe-coding rules).

## Orient Yourself Here First

Before touching game rules, read the specs in this order:

1. **`specs/core/logic.md`** — theme-neutral mechanics (Nodes, Resources, Routes, Carriers, scoring, overflow, delivery events). This is the source of truth for *how the game behaves*, independent of naming/skin.
2. **`specs/themes/metro.md`** — maps core terms to metro terminology (Station/Line/Train/Passenger), plus all concrete config values, rendering order, screen states, and the bug log. Read this for anything metro-specific or to find a tunable number.
3. **`specs/DEBUG.md`** — debug-mode overlay, spawn/speed controls, manual station/passenger injection. Only relevant when testing or adding debug tooling.
4. **`memo.md`** — backlog of undecided/unimplemented future work (styling, scoring, levels, analytics, mobile, persistence, onboarding). Check here before assuming a gap is unintentional, and add to it rather than solving ad hoc if a request expands scope.

Rule of thumb: if a change affects *game rules or entity relationships*, update `core/logic.md`. If it's *metro-flavored* (colors, shapes, config numbers, terminology), update `themes/metro.md`. Don't duplicate the same rule in both — core stays abstract, themes only add mappings/values/visuals.

## Code Map

- `src/types/game.ts` — all shared types (`GameState`, `Station`, `Train`, `MetroLine`, `Passenger`, etc.). Start here to understand shape of state.
- `src/config/gameConfig.ts` — every tunable constant (speeds, capacities, intervals, colors). Mirrors the config table in `themes/metro.md` — keep both in sync if you change a value.
- `src/logic/` — pure game logic (stations, trains, lines, passengers, delivery, overflow, the main `gameLoop.ts` tick). No DOM/canvas access allowed here (see core §6).
- `src/render/` — canvas drawing only, one file per layer (stations, lines, trains, passengers, debug overlay), composed by `renderer.ts` in the draw order specified in `themes/metro.md` §6.
- `src/hooks/` — React glue: `useGameLoop.ts` drives the RAF loop, `useGameState.ts` syncs mutable game state to React state at ~10Hz, `useMouseInput.ts` wires canvas input to `input/mouseHandler.ts`.
- `src/components/` — screens/UI (`StartScreen`, `HUD`, `GameCanvas`, `DeliveryModal`, `GameOverScreen`).

## Architecture Constraints (see core/logic.md §6 for full detail)

- Game state is one mutable object; UI reads a shallow synced copy — don't make logic depend on React re-renders.
- Entity ID counters live inside `GameState`, never at module scope (caused a prior bug — see `themes/metro.md` §9 Bug Log, B3).
- The RAF/render loop must not restart on UI re-renders (prior bug B2 — keep sync callback identity stable).
- All `src/logic/` functions must be pure.

## When Extending

- New game rule → check if it's theme-neutral (goes in core) or metro-specific (goes in theme) before writing code.
- Fixed a non-obvious bug → add a row to the Bug Log in `themes/metro.md` §9, same format as existing entries.
- Noticed a gap or deferred feature → add it to `memo.md` instead of leaving it undocumented.
