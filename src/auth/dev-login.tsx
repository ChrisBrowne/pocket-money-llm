import { Elysia } from "elysia";
import { escapeHtml } from "@kitajs/html";
import { signSession, COOKIE_NAME, cookieOptions } from "./session";
import type { Config } from "../config";
import { VERSION } from "../version";

/**
 * Dev login — Midnight Strip redesign.
 *
 * Stays an HTML document of its own (no Layout) because there's no session
 * yet. Wears the same neon visual language: backdrop, Monoton wordmark,
 * glass card with neon-pill buttons per allowed email.
 *
 * Functional contract unchanged:
 *   • GET /dev/login → renders the page
 *   • POST /dev/login with form field `email` → 302 to / on success,
 *     403 on email not in whitelist
 *   • data-testid="dev-login-{email}" preserved on each button
 */

export function devLoginRoutes(config: Config) {
  return new Elysia({ name: "dev-login" })
    .get("/dev/login", () => {
      const emails = Array.from(config.allowedEmails);
      return (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <meta name="theme-color" content="#08001a" />
            <title>Dev Login — Pocket Money Tracker</title>
            <link
              rel="stylesheet"
              href={`/styles.css?v=${encodeURIComponent(VERSION)}`}
            />
          </head>
          <body class="min-h-screen text-ink flex items-center justify-center p-6">
            <div class="strip-backdrop" aria-hidden="true">
              <div class="horizon"></div>
              <div class="sun"></div>
              <div class="sun-bands"></div>
              <div class="stars"></div>
              <div class="grid-floor"></div>
              <div class="vignette"></div>
            </div>

            <div class="w-full max-w-sm">
              <div class="text-center mb-6">
                <p class="font-display text-[3rem] leading-none tracking-[0.12em] text-primary glow-primary flicker">
                  Pocket
                </p>
                <p class="font-display text-[3rem] leading-none tracking-[0.12em] text-accent glow-accent mt-1">
                  Money
                </p>
                <p class="font-alt text-[11px] tracking-[0.4em] text-cool glow-cool mt-5">
                  ↜ dev login ↝
                </p>
              </div>

              <div class="strip-card">
                <p class="font-mono text-[10px] tracking-[0.16em] uppercase text-dim mb-4">
                  Select an account
                </p>
                <div class="flex flex-col gap-3">
                  {emails.map((email) => {
                    const safeEmail = escapeHtml(email);
                    return (
                      <form method="post" action="/dev/login" class="m-0">
                        <input type="hidden" name="email" value={safeEmail} />
                        <button
                          type="submit"
                          data-testid={`dev-login-${safeEmail}`}
                          class="neon-pill is-full"
                          style="text-transform: none; letter-spacing: 0.02em; font-size: 0.875rem;"
                        >
                          {safeEmail}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            </div>
          </body>
        </html>
      );
    })
    .post("/dev/login", ({ body, cookie, set }) => {
      const email = (body as { email?: string }).email ?? "";

      if (!config.allowedEmails.has(email)) {
        set.status = 403;
        return "Forbidden: email not in whitelist";
      }

      const name = email.split("@")[0] || email;
      const session = { email, name };
      const signed = signSession(session, config.cookieSecret);
      const opts = cookieOptions(config.devMode);

      const sessionCookie = cookie[COOKIE_NAME];
      if (sessionCookie) {
        sessionCookie.set({
          value: signed,
          httpOnly: opts.httpOnly,
          sameSite: opts.sameSite,
          secure: opts.secure,
          path: opts.path,
        });
      }

      set.status = 302;
      set.headers["location"] = "/";
      return "";
    });
}
