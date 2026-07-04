# Testing Harness

Isolated Playwright harness that drives the running game via the browser and debug mode — the same inputs a player has, nothing wired into `src/`. See `../specs/testing.md` for the behavior spec (what's tested, how findings are classified, report format).

## Setup

```bash
cd testing
npm install
npx playwright install chromium   # first time only
```

## Run

```bash
npm test            # runs all flows, starts the dev server automatically
npm run test:ui      # interactive UI mode
npm run report       # view the last HTML report
```

Findings that need write-up go in `reports/` as markdown, following the table format in `../specs/testing.md` §6. Nothing here should ever be promoted into `../specs/` automatically — that's a human call.
