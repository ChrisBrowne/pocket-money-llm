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
        <link rel="stylesheet" href="/styles.css" />
        <link
          rel="icon"
          href="data:image/svg+xml,&lt;svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22&gt;&lt;text y=%22.9em%22 font-size=%2290%22&gt;🪙&lt;/text&gt;&lt;/svg&gt;"
        />
        <script src="/htmx.min.js"></script>
        <meta name="htmx-config" content='{"allowNestedOobSwaps": false}' />
      </head>
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        <header class="bg-white border-b border-gray-200 px-4 py-3">
          <div class="max-w-lg mx-auto flex items-center justify-between">
            <a
              href="/"
              class="text-lg font-semibold text-gray-800 no-underline"
            >
              Pocket Money
            </a>
            {safeSessionName && (
              <div class="flex items-center gap-3">
                <span data-testid="session-name" class="text-sm text-gray-600">
                  {safeSessionName}
                </span>
                <form method="post" action="/auth/logout">
                  <button
                    type="submit"
                    data-testid="logout-button"
                    class="text-sm text-gray-500 hover:text-gray-700 underline"
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
