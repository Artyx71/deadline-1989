import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pages.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [['list']],
  outputDir: 'test-results/pages',
  use: {
    baseURL: process.env.PAGES_BASE_URL ?? 'http://127.0.0.1:5176/deadline-1989/',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      ...(process.env.PLAYWRIGHT_USE_BUNDLED === '1' ? {} : { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium' }),
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PAGES_BASE_URL ? undefined : {
    command: 'node scripts/workspace.mjs preview:pages',
    url: 'http://127.0.0.1:5176/deadline-1989/',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
