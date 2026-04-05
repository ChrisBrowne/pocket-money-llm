import { defineConfig } from "@playwright/test"

const PORT = 3200

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // run tests serially within each file (each file gets its own DB)
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // single worker — each test creates its own state
  reporter: "list",
  timeout: 15000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  webServer: {
    command: `DATABASE_PATH=/tmp/pm-e2e-${Date.now()}.db COOKIE_SECRET=e2e-test-secret BACKUP_API_KEY=e2e-test-key ALLOWED_EMAILS=topher@example.com,sarah@example.com DEV_MODE=true PORT=${PORT} bun src/index.tsx`,
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 10000,
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
