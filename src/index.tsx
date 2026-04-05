import { Elysia } from "elysia"
import { html } from "@elysiajs/html"
import { staticPlugin } from "@elysiajs/static"
import { loadConfig } from "./config"
import { openDatabase } from "./db"
import { logger } from "./logger"
import { sessionMiddleware } from "./auth/session-middleware"
import { apiKeyMiddleware } from "./auth/api-key-middleware"
import { devLoginRoutes } from "./auth/dev-login"
import { googleOAuthRoutes } from "./auth/google-oauth"
import { COOKIE_NAME, expiredCookieOptions } from "./auth/session"
import { childrenHandlers } from "./children/handlers"
import { transactionHandlers } from "./transactions/handlers"
import { backupHandlers, backupApiHandlers } from "./backup/handlers"

const config = loadConfig()
const db = openDatabase(config.databasePath)

const app = new Elysia()
  .use(html())
  .use(staticPlugin({ prefix: "/", assets: "public" }))

  // Request logging per ADR-0029
  .onBeforeHandle({ as: "global" }, ({ request, store }) => {
    ;(store as any).__requestStart = performance.now()
  })
  .onAfterHandle({ as: "global" }, ({ request, set, store }) => {
    // HTTP security headers
    set.headers["x-content-type-options"] = "nosniff"
    set.headers["x-frame-options"] = "DENY"
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin"

    // Request logging
    const start = (store as any).__requestStart as number | undefined
    const duration = start ? Math.round(performance.now() - start) : undefined
    const url = new URL(request.url)
    if (url.pathname !== "/health") {
      logger.info(
        { method: request.method, path: url.pathname, status: set.status ?? 200, duration },
        "request",
      )
    }
  })

  // Health check — no auth required
  .get("/health", () => "<span>ok</span>")

  // Top-level error handler per ADR-0013 and ADR-0030
  .onError({ as: "global" }, ({ error }) => {
    logger.error({ err: error, stack: (error as Error).stack }, "Unhandled error")
    return new Response(
      `<template><div id="global-error" hx-swap-oob="true"><div class="bg-red-50 border border-red-200 rounded-md p-4 shadow-lg"><p class="text-sm text-red-700">Something went wrong. Please try again.</p></div></div></template>`,
      {
        status: 200,
        headers: { "content-type": "text/html" },
      },
    )
  })

// Auth routes (no session auth) — conditional on DEV_MODE
if (config.devMode) {
  app.use(devLoginRoutes(config))
  logger.warn("DEV_MODE is enabled — using dev login bypass (ADR-0028)")
} else {
  app.use(googleOAuthRoutes(config))
}

// Backup API routes — API key auth
app.group("/api", (group) =>
  group
    .use(apiKeyMiddleware(config.backupApiKey))
    .use(backupApiHandlers(db)),
)

// UI routes — session auth
app.group("", (group) =>
  group
    .use(sessionMiddleware(config))
    .use(childrenHandlers(db, config))
    .use(transactionHandlers(db, config))
    .use(backupHandlers(db, config))
    .post("/auth/logout", ({ cookie, set }) => {
      const opts = expiredCookieOptions(config.devMode)
      const sessionCookie = cookie[COOKIE_NAME]
      if (sessionCookie) {
        sessionCookie.set({
          value: "",
          httpOnly: opts.httpOnly,
          sameSite: opts.sameSite,
          secure: opts.secure,
          path: opts.path,
          maxAge: opts.maxAge,
        })
      }
      set.status = 302
      set.headers["location"] = "/"
      return ""
    }),
)

const server = app.listen(config.port)

logger.info(
  {
    port: config.port,
    databasePath: config.databasePath,
    devMode: config.devMode,
  },
  "Pocket Money Tracker started",
)

// Graceful shutdown on SIGTERM (systemctl stop)
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully")
  server.stop()
  db.close()
  process.exit(0)
})

export { app, db, config }
