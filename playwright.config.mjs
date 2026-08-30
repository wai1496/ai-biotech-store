import { defineConfig } from '@playwright/test';

const viewports = [
  ['mobile-360x800', 360, 800],
  ['mobile-390x844', 390, 844],
  ['mobile-412x915', 412, 915],
  ['tablet-768x1024', 768, 1024],
  ['desktop-1366x768', 1366, 768],
  ['desktop-1440x900', 1440, 900]
];

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } }
  })),
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 30_000
  }
});
