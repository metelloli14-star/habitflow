import { defineConfig, devices } from '@playwright/test';

// `npm run test:e2e` — the production build (`npm run build` first) in a real browser sized like a phone.
// The test stand (database, fake mail server, app) is started by tests/e2e/server.mjs.
const PORT = Number(process.env.E2E_APP_PORT || 3300);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1, // one shared database; the journey tests build on each other
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}`,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    // E2E_CHANNEL=chrome runs the installed Google Chrome (fresh temporary profile) instead of downloading Chromium.
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: `http://localhost:${PORT}/robots.txt`,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
  },
});
