import { Elysia } from "elysia"
import { escapeHtml } from "@kitajs/html"
import { signSession, COOKIE_NAME, cookieOptions } from "./session"
import type { Config } from "../config"

export function devLoginRoutes(config: Config) {
  return new Elysia({ name: "dev-login" })
    .get("/dev/login", () => {
      const emails = Array.from(config.allowedEmails)
      return (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Dev Login — Pocket Money Tracker</title>
            <link rel="stylesheet" href="/styles.css" />
          </head>
          <body class="bg-gray-50 min-h-screen flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
              <h1 class="text-xl font-semibold text-gray-800 mb-2">Dev Login</h1>
              <p class="text-sm text-gray-500 mb-6">Select an account:</p>
              <div class="flex flex-col gap-2">
                {emails.map((email) => {
                  const safeEmail = escapeHtml(email)
                  return (
                    <form method="post" action="/dev/login">
                      <input type="hidden" name="email" value={safeEmail} />
                      <button
                        type="submit"
                        data-testid={`dev-login-${safeEmail}`}
                        class="w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
                      >
                        {safeEmail}
                      </button>
                    </form>
                  )
                })}
              </div>
            </div>
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

      const name = email.split("@")[0] || email
      const session = { email, name }
      const signed = signSession(session, config.cookieSecret)
      const opts = cookieOptions(config.devMode)

      const sessionCookie = cookie[COOKIE_NAME]
      if (sessionCookie) {
        sessionCookie.set({
          value: signed,
          httpOnly: opts.httpOnly,
          sameSite: opts.sameSite,
          secure: opts.secure,
          path: opts.path,
        })
      }

      set.status = 302
      set.headers["location"] = "/"
      return ""
    })
}
