import { Elysia } from "elysia"
import { escapeHtml } from "@kitajs/html"
import { signSession, COOKIE_NAME, cookieOptions } from "./session"
import type { Config } from "../config"

export function devLoginRoutes(config: Config) {
  return new Elysia({ name: "dev-login" })
    .get("/dev/login", () => {
      const emails = Array.from(config.allowedEmails)
      return (
        <html>
          <head>
            <title>Dev Login — Pocket Money Tracker</title>
          </head>
          <body>
            <h1>Dev Login</h1>
            <p>Select an account to log in as:</p>
            {emails.map((email) => {
              const safeEmail = escapeHtml(email)
              return (
                <form method="post" action="/dev/login">
                  <input type="hidden" name="email" value={safeEmail} />
                  <button type="submit" data-testid={`dev-login-${safeEmail}`}>
                    {safeEmail}
                  </button>
                </form>
              )
            })}
          </body>
        </html>
      )
    })
    .post("/dev/login", ({ body, cookie, set }) => {
      const email = (body as { email?: string }).email ?? ""

      if (!config.allowedEmails.has(email)) {
        set.status = 403
        return "Forbidden: email not in whitelist"
      }

      // Use email local part as display name in dev mode
      const name = email.split("@")[0] || email
      const session = { email, name }
      const signed = signSession(session, config.cookieSecret)
      const opts = cookieOptions(config.devMode)

      cookie[COOKIE_NAME].set({
        value: signed,
        httpOnly: opts.httpOnly,
        sameSite: opts.sameSite,
        secure: opts.secure,
        path: opts.path,
      })

      set.status = 302
      set.headers["location"] = "/"
      return ""
    })
}
