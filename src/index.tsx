import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { loadConfig } from "./config";
import { openDatabase } from "./db";
import { logger } from "./logger";
import { sessionMiddleware } from "./auth/session-middleware";
import { apiKeyMiddleware } from "./auth/api-key-middleware";
import { devLoginRoutes } from "./auth/dev-login";
import { googleOAuthRoutes } from "./auth/google-oauth";
import { COOKIE_NAME, expiredCookieOptions } from "./auth/session";
import { childrenHandlers } from "./children/handlers";
import { transactionHandlers } from "./transactions/handlers";
import { backupHandlers, backupApiHandlers } from "./backup/handlers";

const config = loadConfig();
const db = openDatabase(config.databasePath);

const app = new Elysia()
  .use(html())
  .use(staticPlugin({ prefix: "/", assets: "public" }))

  // Request logging per ADR-0029
  .onBeforeHandle({ as: "global" }, ({ store }) => {
    (store as any).__requestStart = performance.now();
  })
  .onAfterHandle({ as: "global" }, ({ request, set, store }) => {
    // HTTP security headers
    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin";

    // Request logging
    const start = (store as any).__requestStart as number | undefined;
    const duration = start ? Math.round(performance.now() - start) : undefined;
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      logger.info(
        {
          method: request.method,
          path: url.pathname,
          status: set.status ?? 200,
          duration,
        },
        "request",
      );
    }
  })

  // Health check — no auth required
  .get("/health", () => "<span>ok</span>")

  // Top-level error handler per ADR-0013 and ADR-0030
  .onError({ as: "global" }, ({ error }) => {
    logger.error(
      { err: error, stack: (error as Error).stack },
      "Unhandled error",
    );
    return new Response(
      `<template><div id="global-error" data-testid="global-error" class="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50" hx-swap-oob="true"><div class="strip-error"><p class="font-ui text-sm text-ink leading-relaxed">Something went wrong. Please try again.</p></div></div></template>`,
      {
        status: 200,
        headers: { "content-type": "text/html" },
      },
    );
  });

// Auth routes (no session auth) — conditional on DEV_MODE
if (config.devMode) {
  app.use(devLoginRoutes(config));
  logger.warn("DEV_MODE is enabled — using dev login bypass (ADR-0028)");
} else {
  app.use(googleOAuthRoutes(config));
}

// Backup API routes — API key auth
app.group("/api", (group) =>
  group.use(apiKeyMiddleware(config.backupApiKey)).use(backupApiHandlers(db)),
);

// UI routes — session auth
app.group("", (group) =>
  group
    .use(sessionMiddleware(config))
    .use(childrenHandlers(db, config))
    .use(transactionHandlers(db, config))
    .use(backupHandlers(db, config))
    .post("/auth/logout", ({ cookie, set }) => {
      const opts = expiredCookieOptions(config.devMode);
      const sessionCookie = cookie[COOKIE_NAME];
      if (sessionCookie) {
        sessionCookie.set({
          value: "",
          httpOnly: opts.httpOnly,
          sameSite: opts.sameSite,
          secure: opts.secure,
          path: opts.path,
          maxAge: opts.maxAge,
        });
      }
      set.status = 302;
      set.headers["location"] = "/";
      return "";
    }),
);

// Bind to loopback in production (per ADR-0031) so tailnet devices can't
// bypass tailscale serve's TLS termination by hitting port 3000 directly.
// In dev mode bind to 0.0.0.0 so the app is reachable from other devices on
// the local network (e.g. phones for mobile UI testing) — there is no
// tailscale serve in dev and no TLS to bypass.
const hostname = config.devMode ? "0.0.0.0" : "127.0.0.1";
const server = app.listen({ hostname, port: config.port });

logger.info(
  {
    port: config.port,
    databasePath: config.databasePath,
    devMode: config.devMode,
  },
  "Pocket Money Tracker started",
);

// Graceful shutdown on SIGTERM (systemctl stop)
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.stop();
  db.close();
  process.exit(0);
});

export { app, db, config };
