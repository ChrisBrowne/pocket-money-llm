import { escapeHtml } from "@kitajs/html"
import type { PropsWithChildren } from "@kitajs/html"

export function Layout({ title, sessionName, children }: PropsWithChildren<{
  title?: string
  sessionName?: string
}>) {
  const safePageTitle = title
    ? `${escapeHtml(title)} — Pocket Money Tracker`
    : "Pocket Money Tracker"
  const safeSessionName = sessionName ? escapeHtml(sessionName) : undefined

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{safePageTitle}</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/htmx.min.js"></script>
        <meta
          name="htmx-config"
          content='{"allowNestedOobSwaps": false}'
        />
      </head>
      <body>
        <header>
          {safeSessionName && (
            <div>
              <span data-testid="session-name">{safeSessionName}</span>
              <form method="post" action="/auth/logout" style="display:inline">
                <button type="submit" data-testid="logout-button">
                  Logout
                </button>
              </form>
            </div>
          )}
        </header>

        <main>{children as "safe"}</main>

        <div id="global-error" data-testid="global-error"></div>
      </body>
    </html>
  )
}
