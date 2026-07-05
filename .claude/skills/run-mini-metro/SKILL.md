---
name: run-mini-metro
description: Build, run, and drive the Mini Metro game (a Vite + React + canvas web app). Use when asked to start mini-metro, launch the dev server, take a screenshot of the game, click/drag/zoom on the canvas, or otherwise interact with the running app (not its automated Playwright test suite — see specs/testing.md for that).
---

Mini Metro is a Vite + React canvas game with no chromium-cli available in
this environment, so it's driven via a small custom Playwright REPL driver:
`testing/run-driver.mjs`. The driver launches the Vite dev server itself
(auto-detecting whatever port Vite actually binds), opens headless Chromium,
and accepts one command per line on stdin. It reuses `testing/`'s existing
`@playwright/test` install rather than adding a second one — `testing/` is
this repo's dedicated Playwright harness (see `testing/README.md`).

All paths below are relative to the repo root (`mini-metro/`).

## Prerequisites

Already satisfied if you've ever run the existing test harness. If not:

```bash
cd testing && npm install && npx playwright install chromium
```

No other system packages are needed — this app has no GUI framework beyond
the browser itself (no Electron, no xvfb required; Chromium runs headless).

## Build

No separate build needed to run/drive it — the driver talks to the Vite
**dev** server (`npm run dev`), not a production build. (`npm run build` at
repo root exists and works — `tsc -b && vite build` — but isn't needed for
driving the app.)

## Run (agent path)

From the repo root, write the command list to a scratch file (via the Write
tool) — one command per line — then feed it to the driver over stdin with
input redirection, **not** a `cat <<EOF | node ...` heredoc pipe:

```bash
node testing/run-driver.mjs < /path/to/scratch/driver-commands.txt
```

where `driver-commands.txt` contains, e.g.:

```
start-game
screenshot playing
drag 180 280 620 320
screenshot line-drawn
quit
```

The driver prints `ok <cmd>` / `err <message>` per line, starts the dev
server itself, and shuts it down cleanly on `quit` (or on stdin closing).
Screenshots land in `testing/run-screenshots/<name>.png` (gitignored).

**Why not a heredoc:** `cat <<'EOF' | node testing/run-driver.mjs ... EOF` is
one Bash tool call whose command text spans multiple lines, with different
body content every invocation. Claude Code's Bash permission allowlist
matches rules like `Bash(prefix*)` via a glob→regex conversion where `*`
doesn't cross newlines — so a heredoc body defeats even a rule that looks
like it should cover it (e.g. the already-present broad `Bash(cat *)`), and
you get re-prompted on every call regardless of what's on the allowlist.
Redirecting from a file keeps the actual shell command to one line
(`node testing/run-driver.mjs < file`), which a plain prefix rule matches
cleanly — already covered here by the existing broad `Bash(node *)` allow
rule, so it shouldn't prompt at all.

Coordinates for `click`/`drag`/`wheel` are **canvas-relative** (0,0 = the
`<canvas>` element's top-left corner, matching in-game world coordinates at
the default 1× zoom) — the driver adds the canvas's real page offset for
you. The three starting stations are fixed at circle `(180,280)`, triangle
`(400,180)`, square `(620,320)` (mirrors `testing/helpers/gameDriver.ts`'s
`FIXED_STATIONS`).

| command | what it does |
|---|---|
| `nav [path]` | Navigate to `path` (default `/`) on the dev server |
| `start-game` | Click the Start button on the start screen |
| `screenshot [name]` | Save a PNG to `testing/run-screenshots/` |
| `click <x> <y>` | Click a canvas-relative point |
| `drag <x1> <y1> <x2> <y2> [steps]` | Mouse-drag between two canvas-relative points (e.g. draw a line between stations) |
| `wheel <x> <y> <deltaY> [ticks]` | Scroll-wheel at a canvas-relative point, `ticks` times (positive `deltaY` zooms out) |
| `key <key>` | Press a keyboard key (e.g. `key d` toggles debug mode) |
| `wait <ms>` | Wait (use after actions before screenshotting — the canvas draws on the next animation frame) |
| `eval <js>` | `page.evaluate` an expression, prints the JSON result |
| `console` | Print collected browser console/page errors so far |
| `quit` / `exit` | Close the browser, kill the dev server, exit |

For iterative/interactive use instead of a one-shot file, `tmux` +
`send-keys`/`capture-pane` against `node testing/run-driver.mjs` works the
same way in principle (this container has no `tmux` installed, so that exact
invocation is unverified here — the file-redirect form above is the tested
path).

## Run (human path)

```bash
npm run dev   # → http://localhost:5173 (or next free port). Ctrl-C to stop.
```

Open the printed URL in a real browser. Not useful for an agent — no headless
equivalent of "look at the window" without the driver above.

## Test

The project's actual correctness test suite is separate from this driver —
see `specs/testing.md` and `testing/README.md`:

```bash
cd testing && npm test
```

Expected result: 8 passed, 1 skipped, 1 failed (`overflow-gameover.spec.ts`)
— that failure is a real, already-documented product bug (`specs/memo.md`
"Game over can never trigger"), not a flaky or broken test. The skipped
`restart.spec.ts` depends on reaching game-over first.

## Gotchas

- **Vite hops ports if 5173 is busy** (5174, 5175, …) if another dev server
  is already running. The driver parses the real port from the dev server's
  own stdout (`Local: http://localhost:PORT`) rather than assuming 5173 —
  don't hardcode the port when extending the driver.
- **Commands must be serialized.** Node's `readline` fires `line` events
  synchronously for every buffered line in a piped heredoc — without an
  explicit promise queue, `quit` runs (and closes the browser) before
  earlier commands like `screenshot` finish, producing "Target page ...
  has been closed" errors. The driver chains each command after the
  previous one resolves; preserve that pattern if you modify it.
- **Wait a beat before screenshotting after input.** The game's render loop
  draws on the next `requestAnimationFrame`, so a `screenshot` issued
  immediately after `drag`/`click` can catch a stale frame — use `wait 200`
  first (same gotcha documented in `CLAUDE.md` for the Playwright test
  flows).
- **Debug mode (`key d`) draws a semi-transparent overlay that visibly
  overlaps the HUD bar** — this is a known, already-logged bug (`themes/metro.md`
  §11, entry B7), not a driver problem.
- **Draw lines before toggling debug mode.** Once debug mode is on, every
  canvas mousedown opens the debug popup instead of starting a line drag
  (see `CLAUDE.md`).
