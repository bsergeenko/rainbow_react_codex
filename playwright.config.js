import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm.cmd run dev -- --host localhost', url: 'http://localhost:5173', reuseExistingServer: true },
});
