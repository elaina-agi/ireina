import { defineConfig } from '@playwright/test';

// Set TEST_BASE_URL to test an already running site (e.g. a preview build); otherwise
// Playwright reuses a dev server already listening on 4321, or starts one and stops it afterwards.
// `--ignore-lock` keeps `astro dev` in the foreground: Astro 7 auto-backgrounds the dev server
// when it detects an AI coding agent, which Playwright would treat as an early exit.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4321';

export default defineConfig({
  testDir: './tests/site',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL, viewport: { width: 1440, height: 900 }, headless: true, trace: 'retain-on-failure', launchOptions: { args: ['--no-sandbox'] } },
  reporter: 'list',
  webServer: process.env.TEST_BASE_URL ? undefined : {
    // Run Astro with node directly (not via pnpm or the .bin shim) so the stop signal reaches
    // the server and the same command works on Linux/WSL and Windows.
    command: 'node node_modules/astro/bin/astro.mjs dev --port 4321 --host 127.0.0.1 --ignore-lock',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
