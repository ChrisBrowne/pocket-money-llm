import { test as base, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";

/**
 * Per-worker server fixture.
 *
 * Each Playwright worker spawns its own Bun process on a unique port with
 * its own SQLite database file. Tests within a worker run sequentially
 * against that worker's server; tests across workers run in parallel
 * against independent servers, so there's no shared mutable state to clash
 * over. Aligns with the test-isolation convention in CLAUDE.md.
 *
 * Ports start at 3300 to stay clear of a dev server on 3000 and the old
 * fixed e2e port 3200. Each worker takes 3300 + workerIndex.
 *
 * Databases are written to /tmp/pm-e2e-<workerIndex>-<timestamp>.db so
 * a stale file from a previous run can't leak into a fresh worker. The
 * Makefile's `clean` target already removes /tmp/pm-e2e-*.db with a glob.
 */

type AppServer = {
  baseURL: string;
};

type WorkerFixtures = {
  appServer: AppServer;
};

const STARTUP_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;
const SHUTDOWN_GRACE_MS = 2_000;

async function waitForHealthy(baseURL: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/health`);
      if (response.ok) return;
    } catch {
      // Server isn't listening yet — retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Server at ${baseURL} did not become healthy in time`);
}

async function stopServer(proc: ChildProcess): Promise<void> {
  if (proc.exitCode !== null) return;
  proc.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      // SIGTERM was ignored — force kill. Belt-and-braces against zombies.
      if (proc.exitCode === null) proc.kill("SIGKILL");
      resolve();
    }, SHUTDOWN_GRACE_MS);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export const test = base.extend<NonNullable<unknown>, WorkerFixtures>({
  appServer: [
    async ({}, use, workerInfo) => {
      const port = 3300 + workerInfo.workerIndex;
      const dbPath = `/tmp/pm-e2e-${workerInfo.workerIndex}-${Date.now()}.db`;
      const baseURL = `http://localhost:${port}`;

      const proc = spawn("bun", ["src/index.tsx"], {
        env: {
          ...process.env,
          DATABASE_PATH: dbPath,
          COOKIE_SECRET: "e2e-test-secret",
          BACKUP_API_KEY: "e2e-test-key",
          ALLOWED_EMAILS: "topher@example.com,sarah@example.com",
          DEV_MODE: "true",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      try {
        await waitForHealthy(baseURL);
        await use({ baseURL });
      } finally {
        await stopServer(proc);
      }
    },
    { scope: "worker" },
  ],

  baseURL: async ({ appServer }, use) => {
    await use(appServer.baseURL);
  },
});

export { expect };
