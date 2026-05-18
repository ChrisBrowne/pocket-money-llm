import { escapeHtml } from "@kitajs/html";
import type { PropsWithChildren } from "@kitajs/html";
import { VERSION } from "../version";

/**
 * Layout — page chrome for the Midnight Strip redesign.
 *
 * Visual responsibilities:
 *   • mount the sun-grid backdrop (z-index:-1 behind everything)
 *   • render the neon top bar (menu pill · wordmark · exit pill)
 *   • slide-in side drawer with "Add child" / "Backup & restore"
 *   • centered max-w-lg main column
 *   • version footer + global-error sink for OOB error swaps
 *
 * Functional responsibilities (unchanged from the previous Layout):
 *   • takes optional `title` and `sessionName`; hides menu/header buttons
 *     when there's no session
 *   • side menu toggles via inline onclick attrs against menu-backdrop +
 *     menu's -translate-x-full class — no extra JS bundle needed
 *   • #global-error stays present on every page so the top-level Elysia
 *     error handler can OOB-swap a friendly error into it
 *
 * Selectors with [data-testid] are preserved so Playwright tests keep
 * passing without changes.
 */

const REPO_URL = "https://github.com/ChrisBrowne/pocket-money-tracker";

export function Layout({
  title,
  sessionName,
  children,
}: PropsWithChildren<{
  title?: string;
  sessionName?: string;
}>) {
  const safePageTitle = title
    ? `${escapeHtml(title)} — Pocket Money Tracker`
    : "Pocket Money Tracker";
  const safeSessionName = sessionName ? escapeHtml(sessionName) : undefined;
  const safeVersion = escapeHtml(VERSION);
  const commitUrl =
    VERSION === "unknown"
      ? null
      : `${REPO_URL}/commit/${encodeURIComponent(VERSION)}`;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#08001a" />
        <title>{safePageTitle}</title>
        {/* Cache-bust styles.css with the build version so browsers fetch the
            fresh file after every deploy instead of serving the stale cached one. */}
        <link
          rel="stylesheet"
          href={`/styles.css?v=${encodeURIComponent(VERSION)}`}
        />
        <link
          rel="icon"
          href="data:image/svg+xml,&lt;svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22&gt;&lt;text y=%22.9em%22 font-size=%2290%22&gt;🪙&lt;/text&gt;&lt;/svg&gt;"
        />
        <script src={`/htmx.min.js?v=${encodeURIComponent(VERSION)}`}></script>
        <meta name="htmx-config" content='{"allowNestedOobSwaps": false}' />
      </head>
      <body class="min-h-screen text-ink">
        {/* Backdrop sits behind everything else via z-index:-1. */}
        <div class="strip-backdrop" aria-hidden="true">
          <div class="horizon"></div>
          <div class="sun"></div>
          <div class="sun-bands"></div>
          <div class="stars"></div>
          <div class="grid-floor"></div>
          <div class="vignette"></div>
        </div>

        {safeSessionName && (
          <>
            {/* Tap-to-dismiss backdrop */}
            <div
              id="menu-backdrop"
              data-testid="menu-backdrop"
              onclick="document.getElementById('menu').classList.add('-translate-x-full'); document.getElementById('menu-backdrop').classList.add('hidden');"
              class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-40"
            ></div>

            {/* Slide-in drawer */}
            <aside
              id="menu"
              data-testid="menu"
              class="strip-menu fixed inset-y-0 left-0 w-80 max-w-[80vw] transform -translate-x-full transition-transform duration-200 z-50 flex flex-col overflow-hidden"
            >
              {/* dim grid texture inside the drawer */}
              <div
                aria-hidden="true"
                class="absolute inset-0 opacity-20 pointer-events-none"
                style="background-image: linear-gradient(rgb(255 46 147 / 0.4) 1px, transparent 1px), linear-gradient(90deg, rgb(255 46 147 / 0.4) 1px, transparent 1px); background-size: 24px 24px; mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);"
              ></div>

              <div class="relative flex items-center justify-between p-5 pt-20">
                <span class="font-display text-2xl tracking-[0.18em] text-primary glow-primary flicker">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  data-testid="menu-close"
                  onclick="document.getElementById('menu').classList.add('-translate-x-full'); document.getElementById('menu-backdrop').classList.add('hidden');"
                  class="neon-icon-btn is-cool"
                  style="width: 2rem; height: 2rem;"
                >
                  ×
                </button>
              </div>

              <nav class="relative flex flex-col gap-3 px-5">
                <a
                  href="/add-child"
                  data-testid="menu-add-child"
                  class="strip-menu-item"
                >
                  <div class="font-ui text-[15px] font-bold text-cool tracking-wide">
                    Add a kid
                  </div>
                  <div class="font-mono text-[10px] tracking-[0.1em] uppercase text-dim mt-1">
                    register a new family member
                  </div>
                </a>
                <a
                  href="/backup"
                  data-testid="menu-backup"
                  class="strip-menu-item is-accent"
                >
                  <div class="font-ui text-[15px] font-bold text-accent tracking-wide">
                    Backup & restore
                  </div>
                  <div class="font-mono text-[10px] tracking-[0.1em] uppercase text-dim mt-1">
                    export or import your vault
                  </div>
                </a>
              </nav>

              <div class="relative mt-auto px-5 py-5 border-t border-white/8 font-mono text-[9px] tracking-[0.16em] text-very-dim">
                signed in as
                <br />
                <span class="text-cool">{safeSessionName}</span>
                <br />
                <span class="text-dim mt-1 inline-block">
                  build · {safeVersion}
                </span>
              </div>
            </aside>
          </>
        )}

        <header class="relative z-20 px-4 pt-5 pb-3">
          <div class="max-w-lg mx-auto flex items-center justify-between gap-3">
            {safeSessionName ? (
              <button
                type="button"
                aria-label="Open menu"
                data-testid="menu-button"
                onclick="document.getElementById('menu').classList.remove('-translate-x-full'); document.getElementById('menu-backdrop').classList.remove('hidden');"
                class="neon-icon-btn"
              >
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect width="14" height="1.5" rx="0.75" />
                  <rect y="4.25" width="14" height="1.5" rx="0.75" />
                  <rect y="8.5" width="14" height="1.5" rx="0.75" />
                </svg>
              </button>
            ) : (
              <div class="w-[2.375rem] h-[2.375rem]" />
            )}

            <a
              href="/"
              class="font-display text-[1.5rem] tracking-[0.12em] text-primary glow-primary flicker no-underline leading-none"
            >
              Pocket Money
            </a>

            {safeSessionName ? (
              <form method="post" action="/auth/logout" class="m-0">
                <button
                  type="submit"
                  data-testid="logout-button"
                  class="neon-pill is-cool is-sm cursor-pointer"
                  title="Logout"
                >
                  Exit
                </button>
              </form>
            ) : (
              <div class="w-[2.375rem] h-[2.375rem]" />
            )}
          </div>
          {safeSessionName && (
            <div class="max-w-lg mx-auto mt-2 text-center font-mono text-[9px] tracking-[0.24em] uppercase text-very-dim">
              operator ·{" "}
              <span data-testid="session-name" class="text-dim">
                {safeSessionName}
              </span>
            </div>
          )}
        </header>

        <main class="max-w-lg mx-auto px-4 py-6">{children as "safe"}</main>

        <footer
          class="text-center font-mono text-[9px] tracking-[0.32em] text-very-dim py-4"
          data-testid="version-footer"
        >
          {commitUrl ? (
            <a
              href={commitUrl}
              class="hover:text-dim no-underline"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="version"
            >
              ✦ {safeVersion} ✦
            </a>
          ) : (
            <span data-testid="version">✦ {safeVersion} ✦</span>
          )}
        </footer>

        {/* Sink for the top-level error handler's OOB swap (see index.tsx). */}
        <div
          id="global-error"
          data-testid="global-error"
          class="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50"
        ></div>
      </body>
    </html>
  );
}
