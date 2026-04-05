# Pocket Money Tracker -- Implementation Plan

## Context

The domain specification is complete: 29 ADRs, an Allium spec, and 30+ scenarios in `docs/scenarios.md`. No implementation code exists yet. This plan delivers the application in phases, each independently testable, following the developer guidelines in CLAUDE.md (functional core/imperative shell, parse don't validate, feature-based organisation, Makefile as the developer interface, no mocks).

---

## Directory Structure

```
src/
  index.tsx                     -- Elysia app entrypoint
  config.ts                     -- env var parsing, fail-fast
  db.ts                         -- SQLite connection + schema init (module-level singleton)
  logger.ts                     -- Pino instance (module-level singleton)
  styles/
    input.css                   -- Tailwind v4 entry point (@import "tailwindcss")
  shared/
    result.ts                   -- Result<T,E>, Option<T>
    types.ts                    -- branded types: ChildName, Pence
    currency.ts                 -- formatPence ("£X.XX")
    layout.tsx                  -- HTML shell (vendored HTMX, built CSS, OOB error element)
  auth/
    session.ts                  -- cookie sign/verify, Session type
    session-middleware.ts        -- Elysia derive for session + beforeHandle guard
    api-key-middleware.ts        -- Elysia guard for backup API routes (timing-safe comparison)
    google-oauth.ts             -- OAuth routes (registered only when DEV_MODE=false)
    dev-login.tsx               -- /dev/login route + view (registered only when DEV_MODE=true)
  children/
    domain.ts                   -- pure child-related functions
    commands.ts                 -- addChild, removeChild, listChildren, getChild
    handlers.ts                 -- Elysia route handlers
    views.tsx                   -- home page, child cards, add form, empty state
  transactions/
    domain.ts                   -- pure transaction-related functions
    commands.ts                 -- deposit, withdraw, getTransactions, getChildDetail
    handlers.ts                 -- Elysia route handlers
    views.tsx                   -- child detail page, transaction list, deposit/withdraw forms
  backup/
    schema.ts                   -- Zod BackupData schema (strict, refine for referential integrity)
    commands.ts                 -- exportBackup, restoreBackup, parseBackupFile
    handlers.ts                 -- browser export, API export, restore upload/confirm
    views.tsx                   -- restore summary, confirm dialog, error partial
public/
  htmx.min.js                  -- vendored HTMX (pinned version, no CDN dependency)
  styles.css                    -- built Tailwind output (gitignored)
tests/
  unit/                         -- pure domain functions
  integration/                  -- command handlers with real SQLite
  e2e/                          -- Playwright against running app
Makefile
```

---

## Phase 1: Project Skeleton and Shared Infrastructure

**Goal**: Bun project that starts, loads config, connects to SQLite, and has foundational types. Everything testable from day one.

### 1.1 -- Project initialisation
- `bun init` for `package.json` + `tsconfig.json`
- Dependencies: `elysia`, `@elysiajs/html`, `@elysiajs/static`, `pino`, `zod`
- Dev dependencies: `pino-pretty`, `@tailwindcss/cli`, `@types/bun`, `@kitajs/ts-html-plugin`
- `tsconfig.json`:
  - `"jsx": "react-jsx"`, `"jsxImportSource": "@kitajs/html"` (automatic JSX transform -- no manual `Html` import needed in TSX files)
  - `"compilerOptions.plugins": [{ "name": "@kitajs/ts-html-plugin" }]` (flags unsafe interpolation at the TypeScript level -- XSS prevention)
- Note: `@elysiajs/html` bundles `@kitajs/html` internally -- no separate install needed
- `src/styles/input.css` with Tailwind v4 entry point: `@import "tailwindcss";` (no `tailwind.config.js` needed -- v4 uses CSS-native configuration)
- Tailwind CSS built via CLI: `bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify`
- Vendor HTMX: download a pinned version of `htmx.min.js` (e.g. 2.0.4) into `public/htmx.min.js` -- no CDN dependency (the app runs on Tailscale and may not have reliable internet)
- `public/` directory served as static assets by Elysia via `@elysiajs/static`
- Update `.env.example` to add `DEV_MODE` (it already exists, just missing that var)
- Update `.gitignore` with `node_modules/`, `.env`, `data/`, `*.db`, `public/styles.css`

### 1.2 -- Result and Option types (`src/shared/result.ts`)
Per ADR-0012:
- `Result<T, E extends Error>` -- discriminated union, `ok(v)`, `err(e)`, `isOk()`, `isErr()`, `assertOk()`, `assertErr()`
- `Option<T>` -- discriminated union, `some(v)`, `none()`, `isSome()`, `isNone()`
- **Unit tests**: constructors, guards narrow types, assertions throw on mismatch

### 1.3 -- Branded types (`src/shared/types.ts`)
- `ChildName` -- branded string, `parseChildName(raw: string): Result<ChildName, Error>` (trims, rejects empty)
- `Pence` -- branded positive integer, `parsePence(raw: unknown): Result<Pence, Error>` (accepts string like "5.00", converts to 500)
- **Unit tests**: valid inputs pass, whitespace-only names rejected, zero/negative amounts rejected, "5.00" -> 500, "0.50" -> 50

### 1.4 -- Currency display (`src/shared/currency.ts`)
- `formatPence(pence: number): string` -- 500 -> "£5.00", -200 -> "-£2.00", 50 -> "£0.50"
- **Unit tests**: cover all values from the AmountsDisplayedAsPoundsAndPence scenario

### 1.5 -- Config (`src/config.ts`)
- Parse all env vars from the Allium config block
- `ALLOWED_EMAILS` -> `Set<string>`, `PORT` defaults 3000, `DEV_MODE` boolean, `DEFAULT_NOTE` defaults "weekly pocket money"
- Fail fast listing all missing required vars
- When `DEV_MODE=true`, skip requiring Google OAuth vars
- Export frozen config object
- **Integration tests**: complete env works, missing required var throws, DEV_MODE skips Google vars

### 1.6 -- Logger (`src/logger.ts`)
- Pino instance, JSON output
- Startup log: port, database path, dev mode status (never secrets)
- Dev mode warning per ADR-0028

### 1.7 -- Database (`src/db.ts`)
- Open SQLite at `DATABASE_PATH` via `bun:sqlite`
- Module-level singleton: `export const db = new Database(config.databasePath)` -- imported directly by command modules, passed as argument to command functions
- Pragmas (run immediately after opening):
  - `PRAGMA journal_mode = WAL;` -- concurrent reads during writes
  - `PRAGMA foreign_keys = ON;` -- **critical**: SQLite disables FK enforcement by default; without this, ON DELETE CASCADE is inert
  - `PRAGMA busy_timeout = 5000;` -- prevents "database is locked" when UI and backup API hit DB simultaneously
  - `PRAGMA synchronous = NORMAL;` -- safe with WAL, faster than default FULL
- Schema (using `CREATE TABLE IF NOT EXISTS` for idempotent startup):
  - `children` (name TEXT PRIMARY KEY, created_at TEXT NOT NULL)
  - `transactions` (id INTEGER PRIMARY KEY AUTOINCREMENT, child_name TEXT NOT NULL REFERENCES children(name) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('deposit','withdrawal')), amount INTEGER NOT NULL CHECK(amount > 0), note TEXT NOT NULL DEFAULT '', recorded_at TEXT NOT NULL, recorded_by TEXT NOT NULL)
- Timestamp format: ISO 8601 UTC everywhere (e.g. `2024-01-15T10:30:00.000Z`) -- consistent between app writes and backup export/import
- **Integration tests**: tables exist, FK constraint enforced (insert transaction with nonexistent child_name fails), CHECK constraint enforced (amount <= 0 fails), CASCADE works (delete child removes transactions)

### 1.8 -- Makefile (initial targets)
- `install` -- `bun install`
- `css` -- `bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify`
- `css-watch` -- same with `--watch` flag
- `dev` -- runs `css-watch` and `bun --watch src/index.tsx` in parallel (DEV_MODE=true)
- `build` -- `css` (anything else needed before start)
- `start` -- `build` then `bun src/index.tsx`
- `test` -- `bun test`
- `test-unit` -- `bun test tests/unit/`
- `test-integration` -- `bun test tests/integration/`
- `clean` -- remove dev DB files and `public/styles.css`

### Verification
`make install && make test` passes. `make dev` starts the server (404 on all routes -- no routes yet).

---

## Phase 2: Auth Infrastructure

**Goal**: Session cookies, middleware, dev login. The app authenticates users in dev mode.

### 2.1 -- Session cookie (`src/auth/session.ts`)
- `Session` type: `{ email: string; name: string }`
- `signSession(session, secret): string` -- JSON -> HMAC-SHA256 sign -> `base64(json).base64(hmac)`
- `verifySession(cookie, secret): Option<Session>` -- verify HMAC, parse JSON
- Uses `Bun.CryptoHasher` (no external dep)
- Cookie attributes (set on every `Set-Cookie`):
  - `HttpOnly` -- prevents JavaScript access (ADR-0016)
  - `SameSite=Lax` -- CSRF mitigation for navigation requests
  - `Secure` -- set in production (when `DEV_MODE=false`); omit in dev for HTTP localhost
  - `Path=/` -- cookie sent on all routes
- **Integration tests**: round-trip, tampered cookie -> none, empty -> none, cookie attributes present

### 2.2 -- Session middleware (`src/auth/session-middleware.ts`)
- Elysia plugin using `derive` to extract session from cookie (per-request, since it depends on the request cookie)
- Reads cookie, verifies signature, checks email in `allowed_emails`
- Success: derives `session: Session` into handler context
- Failure: redirects to `/dev/login` (DEV_MODE) or `/auth/google` (production)
- CSRF protection: `beforeHandle` hook checks `Origin` header on mutation requests (POST, DELETE) matches the expected host. Rejects mismatches with 403.
- **Integration tests**: valid cookie passes, tampered redirects, email not in whitelist redirects, cross-origin POST rejected

### 2.3 -- API key middleware (`src/auth/api-key-middleware.ts`)
- Reads `Authorization: Bearer <key>`, compares to `config.backup_api_key`
- Comparison must be timing-safe: use `crypto.timingSafeEqual` from `node:crypto` (prevents key length leakage via timing side-channel)
- Failure: 401 Unauthorized

### 2.4 -- Dev login (`src/auth/dev-login.tsx`)
- `GET /dev/login` -- renders allowed emails as clickable options
- `POST /dev/login` -- accepts email, sets signed cookie, redirects to `/`
- Only registered when `DEV_MODE=true`

### 2.5 -- Base layout (`src/shared/layout.tsx`)
- HTML document: `<script src="/htmx.min.js">` (vendored, no CDN), `<link>` to `/styles.css` (built Tailwind output)
- HTMX config: `<meta name="htmx-config" content='{"allowNestedOobSwaps": false}'>` -- OOB swaps only processed on response siblings, not descendants (prevents accidental extraction from reused fragments)
- `<div id="global-error"></div>` for OOB error swaps (ADR-0013)
- Slot for page content, logout button
- All dynamic content in TSX views must be escaped via `@kitajs/html` safe patterns (enforced by `@kitajs/ts-html-plugin` at compile time)

### 2.6 -- App entrypoint (`src/index.tsx`)
- Create Elysia app, import config, logger, and db as module singletons
- Register `@elysiajs/static` for `public/` directory
- Session middleware group: UI routes protected by session `derive` + `beforeHandle` guard
- API key middleware group: `/api` routes protected by API key `beforeHandle` guard
- Conditionally register dev login or Google OAuth
- Top-level error handler via Elysia's `onError` lifecycle hook: log error at `error` level, return HTTP 200 with HTMX OOB swap targeting `#global-error` wrapped in `<template>` (see HTMX conventions below)
- `GET /health` -- returns a simple HTML fragment (no auth required), useful for systemd health checks and monitoring
- HTTP security headers via `onAfterHandle` hook on all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Listen on `config.port`

### Verification
`make dev` starts app. Visiting `/` redirects to `/dev/login`. Clicking an email sets cookie and redirects to `/` (bare layout). All tests pass.

---

## Phase 3: Children Feature (Home Page)

**Goal**: Home page with child listing, add child, remove child. First feature through all layers.

### 3.1 -- Commands (`src/children/commands.ts`)
- `addChild(db, name: ChildName): Result<void, DuplicateChildError>` -- INSERT, catch UNIQUE violation
- `removeChild(db, name: ChildName): Result<void, ChildNotFoundError>` -- DELETE (CASCADE), check rows affected
- `listChildren(db): ChildWithBalance[]` -- LEFT JOIN with SUM for derived balance
- `getChild(db, name: string): Option<ChildWithBalance>`
- **Integration tests**: add, list with balance 0, duplicate fails, remove, list empty, remove nonexistent fails

### 3.2 -- Views (`src/children/views.tsx`)
- `HomePage` -- children list, add form, export/restore (wired in Phase 5), logout
- `ChildCard` -- name, formatted balance, link to detail, `data-testid="child-card-{name}"`
- `AddChildForm` -- `hx-post="/children"`, `hx-target="#children-list"`, `data-testid="add-child-form"`
- `EmptyState` -- `data-testid="empty-state"`
- Error partials for duplicate name, empty name

### 3.3 -- Handlers (`src/children/handlers.ts`)
- `GET /` -- listChildren -> HomePage (full page)
- `POST /children` -- parse name -> addChild -> return updated children list partial (`hx-target="#children-list"`, `hx-swap="innerHTML"`). On error (duplicate name, empty name): return error partial targeting the form's error area. All responses HTTP 200.
- `DELETE /children/:name` -- parse name -> removeChild -> return 200 with `HX-Redirect: /` header

### Verification
`make dev`, log in, see empty state. Add "Alice" (£0.00). Add duplicate "Alice" (error). Add "Bob". Remove "Bob". All integration tests pass.

---

## Phase 4: Transactions Feature (Child Detail Page)

**Goal**: Deposit, withdraw, transaction history, balance.

### 4.1 -- Commands (`src/transactions/commands.ts`)
- `deposit(db, childName, amount: Pence, note, recordedBy): Result<void, ChildNotFoundError>`
- `withdraw(db, childName, amount: Pence, note, recordedBy): Result<void, ChildNotFoundError>`
- `getChildDetail(db, name): Option<{ child: ChildWithBalance, transactions: TransactionRow[] }>`
- Transactions ordered by recorded_at DESC
- **Integration tests**: deposit increases balance, withdraw decreases, negative balance allowed (ADR-0004), newest-first ordering, recorded_by captured

### 4.2 -- Views (`src/transactions/views.tsx`)
- `ChildDetailPage` -- name, balance, transaction list, deposit/withdraw forms, remove button
- `TransactionList` -- each row: kind, amount (formatted), note, recorded_at, recorded_by, `data-testid`
- `DepositForm` -- amount (type="number" step="0.01" in pounds), note (pre-filled with default), `data-testid="deposit-form"`
- `WithdrawForm` -- same shape, `data-testid="withdraw-form"`
- `BalanceDisplay` -- `data-testid="balance-display"`

### 4.3 -- Handlers (`src/transactions/handlers.ts`)
- `GET /children/:name` -- getChildDetail -> ChildDetailPage (full page, or 404)
- `POST /children/:name/deposit` -- parse amount + note -> deposit -> return new transaction row targeting `#transaction-list` (`hx-swap="afterbegin"`) PLUS OOB swap for balance display (`#balance-display`), both wrapped in `<template>`. On validation error (zero/negative amount): return error partial targeting the deposit form's error area. All responses HTTP 200.
- `POST /children/:name/withdraw` -- same pattern as deposit

**Parse boundary**: user enters pounds ("5.00"), `parsePence` converts to integer pence (500). Downstream everything is integer.

### Verification
Deposit £5.00 -> balance £5.00, transaction visible. Withdraw £2.00 -> £3.00. Withdraw £10.00 -> -£7.00. Zero amount rejected. All integration tests pass.

---

## Phase 5: Backup Feature

**Goal**: Export and restore through browser UI and API.

### 5.1 -- Zod schema (`src/backup/schema.ts`)
Per ADR-0023:
- `BackupDataSchema` -- `z.strictObject` (no passthrough), `.refine()` for referential integrity (every transaction.child_name in children array)
- **Unit tests**: valid passes, extra fields rejected, orphaned transactions rejected

### 5.2 -- Commands (`src/backup/commands.ts`)
- `exportBackup(db): BackupData`
- `parseBackupFile(raw: unknown): Result<BackupData, Error>` -- Zod parse
- `restoreBackup(db, data: BackupData): Result<void, Error>` -- within SQLite transaction: DELETE all, INSERT children, INSERT transactions
- **Integration tests**: export valid, restore wipes + replaces, round-trip stable

### 5.3 -- Views (`src/backup/views.tsx`)
- `ExportButton` -- `data-testid="export-backup"`
- `RestoreUploadForm` -- file input, `hx-post="/backup/restore/upload"`, `data-testid="restore-upload-form"`
- `RestoreSummary` -- child count, transaction count, exported_at, confirm button, `data-testid="restore-summary"`

### 5.4 -- Handlers (`src/backup/handlers.ts`)
**UI routes** (session middleware):
- `GET /backup/export` -- Content-Disposition: `pocket-money-YYYY-MM-DDTHH-MM-SS.json`
- `POST /backup/restore/upload` -- parse file with Zod -> RestoreSummary (embed raw JSON base64 in hidden form field) or error
- `POST /backup/restore/confirm` -- re-parse from hidden field -> restoreBackup -> redirect home

**API route** (API key middleware):
- `GET /api/backup` -- exportBackup -> JSON

**Two-step restore**: upload returns summary HTML with hidden `<textarea>` containing base64-encoded JSON. Confirm re-parses with Zod before executing. No server-side temp state.

### 5.5 -- Wire into home page
Add ExportButton and RestoreUploadForm to HomePage view.

### Verification
Export downloads JSON. Upload valid file -> summary. Confirm -> data replaced. Upload invalid -> error, no data loss. API with valid key returns JSON, invalid key returns 401.

---

## Phase 6: Google OAuth (Production Auth)

**Goal**: Real OAuth flow for production.

### 6.1 -- OAuth routes (`src/auth/google-oauth.ts`)
- `GET /auth/google` -- redirect to Google consent screen
- `GET /auth/callback` -- exchange code for tokens via raw `fetch()` to Google's token and userinfo endpoints (no OAuth library -- minimal dependency philosophy), extract email + name, check whitelist, sign session cookie or reject
- Only registered when `DEV_MODE` is not true

### 6.2 -- Logout handler
- `POST /auth/logout` -- clear cookie (expired), redirect to `/`

### Verification
With real Google credentials and `DEV_MODE=false`, full OAuth flow works. Unauthorised email rejected. Logout clears session.

---

## Phase 7: Playwright E2E Tests

**Goal**: Full coverage of all scenarios from `docs/scenarios.md`.

### 7.1 -- Setup
- Install `@playwright/test`
- `playwright.config.ts`:
  - Per-worker server instances: each worker starts its own app with unique `DATABASE_PATH` and `PORT`
  - `webServer` config: `DATABASE_PATH=/tmp/pm-test-${workerIndex}.db PORT=${3100 + workerIndex} DEV_MODE=true bun src/index.tsx`
  - `baseURL`: `http://localhost:${3100 + workerIndex}`
  - Temp DB files cleaned up after test run
- Helper: `login(page, email)` -- POST to `/dev/login`
- Makefile target: `test-e2e` -- `bunx playwright test`

### 7.2 -- Test files mapping to scenarios

Every scenario in `docs/scenarios.md` is covered. API key scenarios are integration tests (no browser needed); all others are Playwright e2e tests.

- `tests/e2e/auth.spec.ts` -- AuthorisedParentLogsIn, UnauthorisedEmailRejected (via dev login rejection), UnauthenticatedVisitorRedirected, ParentLogsOut
- `tests/e2e/home.spec.ts` -- HomeShowsEmptyStateWhenNoChildren, HomeShowsAllChildrenWithBalances, AddChildWithEmptyBalance, AddChildRejectsDuplicateName, AddChildRejectsEmptyName, AddChildTrimsWhitespace
- `tests/e2e/child-detail.spec.ts` -- ViewChildDetailShowsBalanceAndHistory, ViewChildDetailWithNoTransactions, DepositIncreasesBalance, DepositUsesDefaultNote, DepositWithCustomNote, DepositWithEmptyNote, DepositRejectsZeroAmount, DepositRejectsNegativeAmount, WithdrawalDecreasesBalance, WithdrawalCanGoNegative, WithdrawalFromZeroBalance, CorrectMistakeWithOffsettingTransaction, RemoveChildDeletesEverything, RemoveChildWithNoTransactions, RemoveChildWithNegativeBalance, TransactionRecordsWhichParentActed, TransactionsAreIsolatedPerChild, AmountsDisplayedAsPoundsAndPence
- `tests/e2e/backup.spec.ts` -- ExportBackupViaBrowser, ExportBackupEmptyDatabase, RestoreShowsConfirmationBeforeExecuting, RestoreRejectsInvalidFile, RestoreRejectsExtraFields, RestoreRejectsOrphanedTransactions, RestoreFromEmptyBackup
- `tests/integration/backup-api.test.ts` -- ExportBackupViaApiKey, ExportBackupApiRejectsInvalidKey, ExportBackupApiRejectsMissingKey (these call the API directly, no browser)

### Verification
`make test-e2e` passes all scenarios. Tests run in parallel with isolated databases.

---

## Phase 8: Polish and Deployment

### 8.1 -- Tailwind styling
- Style all views (responsive for mobile -- parents use this on phones)
- Negative balances in red
- Clean visual hierarchy: cards, tables, forms, errors
- CSS built via `make css`, watched during dev via `make dev`

### 8.2 -- Request logging
- Elysia lifecycle hooks: method, path, status, duration at info level (ADR-0029)

### 8.3 -- Graceful shutdown
- Handle `SIGTERM` (sent by `systemctl stop`): stop Elysia server, close SQLite connection, exit cleanly
- ```ts
  process.on("SIGTERM", () => { server.stop(); db.close(); process.exit(0) })
  ```

### 8.4 -- Deployment artifacts
- `pocket-money.service` -- systemd unit file
- Makefile target: `deploy` (documents the SSH + git pull + restart flow)

### 8.5 -- Final Makefile targets
`install`, `css`, `css-watch`, `build`, `dev`, `start`, `test`, `test-unit`, `test-integration`, `test-e2e`, `lint` (`tsc --noEmit` -- also runs `@kitajs/ts-html-plugin` checks), `clean`, `db-reset`, `deploy`

---

## Phase Dependency Graph

```
Phase 1 (Skeleton) ── no deps
   |
Phase 2 (Auth) ────── needs 1 (config, result, logger)
   |
Phase 3 (Children) ── needs 2 (middleware, layout)
   |
Phase 4 (Transactions) ── needs 3 (children must exist)
   |
Phase 5 (Backup) ──── needs 3+4 (data to export/restore)
   |
Phase 6 (Google OAuth) ── needs 2 only (can parallel 3-5)
   |
Phase 7 (E2E) ─────── needs 3+4+5 (features must exist)
   |
Phase 8 (Polish) ──── needs all above
```

## Implementation Notes

- **Each phase is a commit boundary** -- commit after each phase passes its verification step
- **Tests are written alongside code**, not in a separate pass
- **Makefile grows with each phase** -- new workflows get targets immediately
- **Module-level singletons for db and logger** -- imported directly where needed, passed as arguments to command functions. `derive` is used only for `session` (per-request, depends on cookie). No Elysia `decorate`.
- **All HTTP responses are 200** -- we own both sides of the HTMX client/server contract. Expected errors (duplicate name, validation failures) return 200 with error HTML partials. Unexpected errors (unhandled exceptions) return 200 with OOB error swap. HTTP status codes are a REST API concern, not relevant here. The only exceptions: 401 from API key middleware (consumed by cron, not HTMX), and redirects (302).
- **HTMX OOB convention**: all OOB swap elements are wrapped in `<template>` for consistency. This prevents the browser from briefly rendering OOB content before HTMX extracts it, and is required for table rows/list items. Applying it uniformly means nobody needs to think about which elements need wrapping.
- **HTMX response strategy**: mutations return HTML partials for swap; when multiple page areas need updating (e.g. new transaction row + updated balance), use OOB swaps in `<template>`. Remove child uses `HX-Redirect`. Form errors return error partials targeting the form's error area. Success responses include OOB swap to clear the error area.
- **Pence input**: HTML forms use pounds (type="number" step="0.01"), `parsePence` converts at the boundary
- **Tailwind CSS**: built via `@tailwindcss/cli` v4 (no PostCSS, no bundler, no `tailwind.config.js`). Input: `@import "tailwindcss"`. Output to `public/styles.css` (gitignored). `make css` for one-shot build, `make dev` runs watch mode alongside the Bun server.
- **`make dev` parallelism**: `$(MAKE) css-watch & bun --watch src/index.tsx` (background the CSS watcher, foreground the Bun server)
- **XSS prevention**: `@kitajs/ts-html-plugin` flags unsafe interpolation in TSX at the TypeScript level. `make lint` (`tsc --noEmit`) catches these. All dynamic content (child names, notes, emails) must use safe interpolation patterns.
