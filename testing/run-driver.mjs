#!/usr/bin/env node
// Interactive driver for running & poking the Mini Metro game headlessly.
// A chromium-cli-style REPL: reads one command per line from stdin, drives
// a real headless Chromium page against the Vite dev server, prints results.
//
// Usage:
//   node testing/run-driver.mjs <<'EOF'
//   start-game
//   screenshot playing
//   drag 180 280 620 320
//   screenshot line-drawn
//   quit
//   EOF
//
// Or interactively / via tmux send-keys: `node testing/run-driver.mjs`, then
// type commands one per line.
//
// All coordinates for click/drag/wheel are CANVAS-RELATIVE (0,0 = top-left
// of the <canvas> element, matching world coordinates at the default 1x
// zoom) — the driver adds the canvas's actual page offset for you.

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(__dirname, 'run-screenshots');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const consoleLog = [];

function log(...args) {
  process.stdout.write(args.join(' ') + '\n');
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

// Detect the port Vite actually bound (it hops 5173 -> 5174 -> ... if busy).
function startDevServer() {
  return new Promise((resolve, reject) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const proc = spawn(npmCmd, ['run', 'dev'], { cwd: REPO_ROOT });
    let resolved = false;
    const onData = (data) => {
      const text = data.toString();
      const match = text.match(/Local:\s+http:\/\/localhost:(\d+)/);
      if (match && !resolved) {
        resolved = true;
        resolve({ proc, port: match[1] });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => {
      if (!resolved) reject(new Error('Timed out waiting for Vite dev server to print its URL'));
    }, 20000);
  });
}

async function main() {
  log('[driver] starting Vite dev server...');
  const { proc: devServer, port } = await startDevServer();
  const baseURL = `http://localhost:${port}`;
  const up = await waitForServer(baseURL);
  if (!up) throw new Error(`Dev server never responded at ${baseURL}`);
  log(`[driver] dev server up at ${baseURL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${err}`));
  await page.goto(baseURL);
  log(`[driver] navigated to ${baseURL}`);

  async function canvasBox() {
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('canvas not found on page');
    return box;
  }

  async function toPagePoint(x, y) {
    const box = await canvasBox();
    return { x: box.x + Number(x), y: box.y + Number(y) };
  }

  function shutdown() {
    log('[driver] console log (' + consoleLog.length + ' entries):');
    for (const line of consoleLog) log('  ' + line);
    return browser.close().then(() => devServer.kill());
  }

  // Commands must run strictly in order — readline fires 'line' synchronously
  // for every buffered line, so without this queue a piped heredoc runs every
  // command concurrently (e.g. `quit` closing the browser before `screenshot`
  // finishes) instead of one at a time.
  let queue = Promise.resolve();
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    queue = queue.then(() => processLine(line));
  });

  async function processLine(line) {
    const [cmd, ...args] = line.trim().split(/\s+/);
    if (!cmd) return;
    try {
      switch (cmd) {
        case 'nav': {
          await page.goto(baseURL + (args[0] || '/'));
          log('ok nav');
          break;
        }
        case 'start-game': {
          await page.locator('button').first().click();
          log('ok start-game');
          break;
        }
        case 'screenshot': {
          const name = args[0] || `shot-${Date.now()}`;
          const file = path.join(SCREENSHOT_DIR, `${name}.png`);
          await page.screenshot({ path: file });
          log('ok screenshot ' + file);
          break;
        }
        case 'click': {
          const [x, y] = args;
          const p = await toPagePoint(x, y);
          await page.mouse.click(p.x, p.y);
          log('ok click');
          break;
        }
        case 'drag': {
          const [x1, y1, x2, y2, steps] = args;
          const from = await toPagePoint(x1, y1);
          const to = await toPagePoint(x2, y2);
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          await page.mouse.move(to.x, to.y, { steps: Number(steps) || 10 });
          await page.mouse.up();
          log('ok drag');
          break;
        }
        case 'wheel': {
          const [x, y, deltaY, ticks] = args;
          const p = await toPagePoint(x, y);
          await page.mouse.move(p.x, p.y);
          for (let i = 0; i < (Number(ticks) || 1); i++) {
            await page.mouse.wheel(0, Number(deltaY));
          }
          log('ok wheel');
          break;
        }
        case 'key': {
          await page.keyboard.press(args[0]);
          log('ok key');
          break;
        }
        case 'wait': {
          await page.waitForTimeout(Number(args[0]) || 500);
          log('ok wait');
          break;
        }
        case 'eval': {
          const expr = args.join(' ');
          const result = await page.evaluate(expr);
          log('ok eval ' + JSON.stringify(result));
          break;
        }
        case 'console': {
          log('console log (' + consoleLog.length + ' entries):');
          for (const l of consoleLog) log('  ' + l);
          log('ok console');
          break;
        }
        case 'quit':
        case 'exit': {
          await shutdown();
          process.exit(0);
          break;
        }
        default:
          log('err unknown command: ' + cmd);
      }
    } catch (e) {
      log('err ' + (e && e.message ? e.message : e));
    }
  }

  rl.on('close', () => {
    queue = queue.then(async () => {
      await shutdown();
      process.exit(0);
    });
  });
}

main().catch((e) => {
  console.error('[driver] fatal:', e);
  process.exit(1);
});
