import { Elysia } from "elysia"
import { html } from "@elysiajs/html"
import { staticPlugin } from "@elysiajs/static"
import { loadConfig } from "./config"
import { openDatabase } from "./db"
import { logger } from "./logger"
import { sessionMiddleware } from "./auth/session-middleware"
import { apiKeyMiddleware } from "./auth/api-key-middleware"
import { devLoginRoutes } from "./auth/dev-login"
import { COOKIE_NAME, expiredCookieOptions } from "./auth/session"
import { childrenHandlers } from "./children/handlers"
import { transactionHandlers } from "./transactions/handlers"

const config = loadConfig()
const db = openDatabase(config.databasePath)

const app = new Elysia()
  .use(html())
  .use(staticPlugin({ prefix: "/", assets: "public" }))

  // HTTP security headers on all responses
  .onAfterHandle({ as: "global" }, ({ set }) => {
    set.headers["x-content-type-options"] = "nosniff"
    set.headers["x-frame-options"] = "DENY"
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin"
  })

  // Health check — no auth required
  .get("/health", () => "<span>ok</span>")

  // Top-level error handler per ADR-0013 and ADR-0030
  .onError({ as: "global" }, ({ error }) => {
    logger.error({ err: error, stack: (error as Error).stack }, "Unhandled error")
    return new Response(
      `<template><div id="global-error" hx-swap-oob="true"><p>Something went wrong. Please try again.</p></div></template>`,
      {
        status: 200,
        headers: { "content-type": "text/html" },
      },
    )
  })

// Dev login routes (no auth) — only in dev mode
if (config.devMode) {
  app.use(devLoginRoutes(config))
  logger.warn("DEV_MODE is enabled — using dev login bypass (ADR-0028)")
}

// Backup API routes — API key auth
app.group("/api", (group) =>
  group
    .use(apiKeyMiddleware(config.backupApiKey))
    // Backup API endpoint will be added in Phase 5
    .get("/backup", () => ({ placeholder: true })),
)

// UI routes — session auth
app.group("", (group) =>
  group
    .use(sessionMiddleware(config))
    .use(childrenHandlers(db, config))
    .use(transactionHandlers(db, config))
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

app.listen(config.port)

logger.info(
  {
    port: config.port,
    databasePath: config.databasePath,
    devMode: config.devMode,
  },
  "Pocket Money Tracker started",
)

export { app, db, config }
