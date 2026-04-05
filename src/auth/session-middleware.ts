import { Elysia } from "elysia"
import { verifySession, COOKIE_NAME, type Session } from "./session"
import { isSome } from "../shared/result"
import type { Config } from "../config"

export function sessionMiddleware(config: Config) {
  const loginRedirect = config.devMode ? "/dev/login" : "/auth/google"

  return new Elysia({ name: "session-middleware" })
    .derive({ as: "scoped" }, ({ cookie }): { session: Session } => {
      const cookieValue = String(cookie[COOKIE_NAME]?.value ?? "")
      const result = verifySession(cookieValue, config.cookieSecret)

      if (!isSome(result)) {
        return { session: null as unknown as Session }
      }

      if (!config.allowedEmails.has(result.value.email)) {
        return { session: null as unknown as Session }
      }

      return { session: result.value }
    })
    .onBeforeHandle({ as: "scoped" }, ({ session, request, set }) => {
      // Check session exists
      if (!session) {
        set.status = 302
        set.headers["location"] = loginRedirect
        return ""
      }

      // CSRF: check Origin header on mutation requests
      const method = request.method
      if (method === "POST" || method === "DELETE" || method === "PUT" || method === "PATCH") {
        const origin = request.headers.get("origin")
        if (origin) {
          const requestUrl = new URL(request.url)
          const originUrl = new URL(origin)
          if (originUrl.host !== requestUrl.host) {
            set.status = 403
            return "Forbidden: cross-origin request"
          }
        }
      }
    })
}
