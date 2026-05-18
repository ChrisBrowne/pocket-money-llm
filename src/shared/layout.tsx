import { escapeHtml } from "@kitajs/html";
import type { PropsWithChildren } from "@kitajs/html";
import { VERSION } from "../version";

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
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        {safeSessionName && (
          <>
            {/* Backdrop — tap to dismiss the menu */}
            <div
              id="menu-backdrop"
              data-testid="menu-backdrop"
              onclick="document.getElementById('menu').classList.add('-translate-x-full'); document.getElementById('menu-backdrop').classList.add('hidden');"
              class="fixed inset-0 bg-black/40 hidden z-40"
            ></div>

            {/* Slide-in menu panel */}
            <aside
              id="menu"
              data-testid="menu"
              class="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl transform -translate-x-full transition-transform duration-200 z-50 flex flex-col"
            >
              <div class="flex justify-end p-2 border-b border-gray-200">
                <button
                  type="button"
                  aria-label="Close menu"
                  data-testid="menu-close"
                  onclick="document.getElementById('menu').classList.add('-translate-x-full'); document.getElementById('menu-backdrop').classList.add('hidden');"
                  class="text-gray-500 hover:text-gray-700 text-2xl leading-none px-3 py-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <nav class="flex flex-col">
                <a
                  href="/add-child"
                  data-testid="menu-add-child"
                  class="px-6 py-4 text-gray-800 hover:bg-gray-50 no-underline border-b border-gray-100"
                >
                  Add child
                </a>
                <a
                  href="/backup"
                  data-testid="menu-backup"
                  class="px-6 py-4 text-gray-800 hover:bg-gray-50 no-underline border-b border-gray-100"
                >
                  Backup and restore
                </a>
              </nav>
            </aside>
          </>
        )}

        <header class="bg-white border-b border-gray-200 px-4 py-3">
          <div class="max-w-lg mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2">
              {safeSessionName && (
                <button
                  type="button"
                  aria-label="Open menu"
                  data-testid="menu-button"
                  onclick="document.getElementById('menu').classList.remove('-translate-x-full'); document.getElementById('menu-backdrop').classList.remove('hidden');"
                  class="text-gray-600 hover:text-gray-800 p-2 -ml-2 cursor-pointer"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
              )}
              <a
                href="/"
                class="text-lg font-semibold text-gray-800 no-underline"
              >
                Pocket Money
              </a>
            </div>
            {safeSessionName && (
              <div class="flex items-center gap-3">
                <span data-testid="session-name" class="text-sm text-gray-600">
                  {safeSessionName}
                </span>
                <form method="post" action="/auth/logout">
                  <button
                    type="submit"
                    data-testid="logout-button"
                    class="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
                  >
                    Logout
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main class="max-w-lg mx-auto px-4 py-6">{children as "safe"}</main>

        <footer
          class="text-center text-xs text-gray-400 py-3"
          data-testid="version-footer"
        >
          {commitUrl ? (
            <a
              href={commitUrl}
              class="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="version"
            >
              {safeVersion}
            </a>
          ) : (
            <span data-testid="version">{safeVersion}</span>
          )}
        </footer>

        <div
          id="global-error"
          data-testid="global-error"
          class="fixed bottom-4 left-4 right-4 max-w-lg mx-auto"
        ></div>
      </body>
    </html>
  );
}
