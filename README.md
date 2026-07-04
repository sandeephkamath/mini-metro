# Mini Metro Clone

A Mini Metro-style resource routing game built with React, TypeScript, Vite, and HTML5 canvas.

## Getting Started

```bash
bun install
bun run dev
```

## Folder Structure

```
mini-metro/
├── specs/                    # Behavior specs (plain English, no code)
│   ├── core/logic.md         # Theme-neutral game mechanics — source of truth for game behavior
│   ├── themes/metro.md       # Metro terminology, config values, render order, bug log
│   ├── DEBUG.md              # Debug overlay and dev controls
│   └── memo.md               # Backlog of undecided/future work
│
├── src/
│   ├── types/game.ts         # Shared types (GameState, Station, Train, MetroLine, Passenger, ...)
│   ├── config/gameConfig.ts  # Tunable constants (speeds, capacities, intervals, colors)
│   │
│   ├── logic/                # Pure game logic, no DOM/canvas access
│   │   ├── gameLoop.ts       # Main tick
│   │   ├── stations.ts
│   │   ├── trains.ts
│   │   ├── lines.ts
│   │   ├── passengers.ts
│   │   ├── delivery.ts
│   │   └── overflow.ts
│   │
│   ├── render/                  # Canvas drawing, one file per layer
│   │   ├── renderer.ts          # Composes layers in draw order
│   │   ├── renderStations.ts
│   │   ├── renderLines.ts
│   │   ├── renderTrains.ts
│   │   ├── renderPassengers.ts
│   │   └── renderDebug.ts
│   │
│   ├── hooks/                   # React glue
│   │   ├── useGameLoop.ts       # Drives the requestAnimationFrame loop
│   │   ├── useGameState.ts      # Syncs mutable game state to React state (~10Hz)
│   │   └── useMouseInput.ts     # Wires canvas input to input/mouseHandler.ts
│   │
│   ├── input/mouseHandler.ts
│   │
│   ├── components/              # Screens/UI
│   │   ├── StartScreen.tsx
│   │   ├── HUD.tsx
│   │   ├── GameCanvas.tsx
│   │   ├── DeliveryModal.tsx
│   │   └── GameOverScreen.tsx
│   │
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
│
└── public/
```

## Orientation

Read specs in this order before changing game rules:

1. `specs/core/logic.md` — theme-neutral mechanics (nodes, resources, routes, carriers, scoring, overflow, delivery events)
2. `specs/themes/metro.md` — metro-specific terminology, config values, rendering order, screen states, bug log
3. `specs/DEBUG.md` — debug overlay and controls
4. `specs/memo.md` — backlog of deferred/undecided work

See `CLAUDE.md` for architecture constraints and conventions.
