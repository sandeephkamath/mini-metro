import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './flows',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  // Default (desktop) project runs every spec in flows/ as before. The `mobile`
  // project only runs flows/mobile/** (see flows/mobile/*.spec.ts) — touch-gesture
  // and small-viewport specs that need hasTouch/isMobile, kept separate so the
  // existing desktop-mouse flows aren't run twice under two device profiles.
  projects: [
    {
      name: 'desktop',
      testIgnore: '**/mobile/**',
    },
    {
      name: 'mobile',
      testMatch: '**/mobile/**',
      // iPhone 13's preset defaults to WebKit, which isn't installed in this repo's
      // Playwright setup (only chromium — see testing/README.md). Keep the device's
      // viewport/touch/mobile-UA emulation but force chromium as the engine.
      use: { ...devices['iPhone 13'], defaultBrowserType: undefined, browserName: 'chromium' },
    },
  ],
});
