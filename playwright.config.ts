import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    { name: "webkit-smoke", grep: /@webkit-smoke/u, use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      DEPLOYMENT_ENV: "staging",
      PUBLIC_DATA_MODE: "production",
      RATE_LIMIT_MODE: "memory",
      TURNSTILE_MODE: "disabled",
      NEXT_PUBLIC_TURNSTILE_MODE: "disabled",
      APP_BASE_URL: "https://127.0.0.1:3100",
      TEST_BASE_URL: baseURL,
      E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
      GEOCODER_USER_AGENT: "MapaDobraE2E/1.0",
      GEOCODER_CONTACT_EMAIL: "e2e@example.test",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://ci-placeholder.invalid/ci",
      TEST_BASE_DATABASE_URL: process.env.TEST_BASE_DATABASE_URL ?? "postgresql://ci-placeholder.invalid/base",
      ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL ?? "e2e-admin@example.test",
      ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD ?? "E2E-only-password-123!",
    },
  },
});
