# Pocket Money Tracker -- Implementation Plan

## Context

The domain specification is complete: 29 ADRs, an Allium spec, and 30+ scenarios in `docs/scenarios.md`. No implementation code exists yet. This plan delivers the application in phases, each independently testable, following the developer guidelines in CLAUDE.md (functional core/imperative shell, parse don't validate, feature-based organisation, Makefile as the developer interface, no mocks).

---

## Directory Structure

```
src/
  index.tsx                     -- Elysia app entrypoint
  config.ts                     -- env var parsing, fail-fast
  db.ts                         -- SQLite connection + schema init
  logger.ts                     -- Pino instance
  styles/
    input.css                   -- Tailwind directives (@tailwind base/components/utilities)
  shared/
    result.ts                   -- Result<T,E>, Option<T>
    types.ts                    -- branded types: ChildName, Pence
    currency.ts                 -- formatPence ("£X.XX")
    layout.tsx                  -- HTML shell (HTMX, built CSS, OOB error element)
  auth/
    session.ts                  -- cookie sign/verify, Session type
    session-middleware.ts        -- Elysia guard for UI routes
    api-key-middleware.ts        -- Elysia guard for backup API routes
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
- Dependencies: `elysia`, `@elysiajs/html`, `pino`, `zod`
- Dev dependencies: `pino-pretty`, `@tailwindcss/cli`, `@types/bun`
- `tsconfig.json`: `"jsx": "react"`, `"jsxFactory": "Html.createElement"`, `"jsxFragmentFactory": "Html.Fragment"`
- Note: `@elysiajs/html` bundles `@kitajs/html` internally -- no separate install needed
- `src/styles/input.css` with Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)
- Tailwind CSS built via CLI: `bunx @tailwindcss/cli -i src/styles/input.css -o public/styles.css --minify`
- `public/` directory served as static assets by Elysia (`@elysiajs/static` or manual)
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
- Open SQLite at `DATABASE_PATH` via `bun:sqlite`, enable WAL mode
- Schema:
  - `children` (name TEXT PRIMARY KEY, created_at TEXT NOT NULL)
  - `transactions` (id INTEGER PRIMARY KEY AUTOINCREMENT, child_name TEXT NOT NULL REFERENCES children(name) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('deposit','withdrawal')), amount INTEGER NOT NULL CHECK(amount > 0), note TEXT NOT NULL DEFAULT '', recorded_at TEXT NOT NULL, recorded_by TEXT NOT NULL)
- **Integration tests**: tables exist, FK constraint enforced, CHECK constraint enforced

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
- **Integration tests**: round-trip, tampered cookie -> none, empty -> none

### 2.2 -- Session middleware (`src/auth/session-middleware.ts`)
- Elysia plugin: reads cookie, verifies, checks email in `allowed_emails`
- Success: derives `session: Session` into context
- Failure: redirects to `/dev/login` (DEV_MODE) or `/auth/google` (production)
- **Integration tests**: valid cookie passes, tampered redirects, email not in whitelist redirects

### 2.3 -- API key middleware (`src/auth/api-key-middleware.ts`)
- Reads `Authorization: Bearer <key>`, compares to `config.backup_api_key`
- Failure: 401 Unauthorized

### 2.4 -- Dev login (`src/auth/dev-login.tsx`)
- `GET /dev/login` -- renders allowed emails as clickable options
- `POST /dev/login` -- accepts email, sets signed cookie, redirects to `/`
- Only registered when `DEV_MODE=true`

### 2.5 -- Base layout (`src/shared/layout.tsx`)
- HTML document: HTMX script (CDN), `<link>` to `/styles.css` (built Tailwind output)
- `<div id="global-error"></div>` for OOB error swaps (ADR-0013)
- Slot for page content, logout button

### 2.6 -- App entrypoint (`src/index.tsx`)
- Create Elysia app, load config, init logger, open DB
- Conditionally register dev login or Google OAuth
- Top-level error handler: catch unhandled exceptions, log, return HTMX OOB swap to `#global-error`
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
- `GET /` -- listChildren -> HomePage
- `POST /children` -- parse name -> addChild -> updated children list partial (or error partial)
- `DELETE /children/:name` -- parse name -> removeChild -> redirect to home

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
- `GET /children/:name` -- getChildDetail -> ChildDetailPage (or 404)
- `POST /children/:name/deposit` -- parse amount + note -> deposit -> updated detail partial
- `POST /children/:name/withdraw` -- parse amount + note -> withdraw -> updated detail partial

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
- `GET /auth/callback` -- exchange code for tokens, extract email + name, check whitelist, sign session cookie or reject
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
- `playwright.config.ts`: run server with `DEV_MODE=true`, each worker gets unique `DATABASE_PATH`
- Helper: `login(page, email)` -- POST to `/dev/login`
- Makefile target: `test-e2e` -- `bunx playwright test`

### 7.2 -- Test files mapping to scenarios
- `tests/e2e/auth.spec.ts` -- AuthorisedParentLogsIn, UnauthenticatedVisitorRedirected, ParentLogsOut
- `tests/e2e/home.spec.ts` -- HomeShowsEmptyState, HomeShowsAllChildrenWithBalances, AddChild (happy + error cases), AddChildTrimsWhitespace
- `tests/e2e/child-detail.spec.ts` -- ViewChildDetail, Deposit (happy + error), Withdrawal (happy + negative balance), CorrectMistakeWithOffsetting, TransactionRecordsWhichParentActed, TransactionsAreIsolatedPerChild, AmountsDisplayedAsPoundsAndPence, RemoveChild
- `tests/e2e/backup.spec.ts` -- ExportViaBrowser, ExportEmptyDatabase, RestoreWithConfirmation, RestoreRejectsInvalid, RestoreFromEmpty

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

### 8.3 -- Deployment artifacts
- `pocket-money.service` -- systemd unit file
- Makefile target: `deploy` (documents the SSH + git pull + restart flow)

### 8.4 -- Final Makefile targets
`install`, `css`, `css-watch`, `build`, `dev`, `start`, `test`, `test-unit`, `test-integration`, `test-e2e`, `lint`, `clean`, `db-reset`, `deploy`

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
- **HTMX response strategy**: mutations return HTML partials for swap; remove child uses `HX-Redirect`; form errors return error partials targeting the form's error area
- **Pence input**: HTML forms use pounds (type="number" step="0.01"), `parsePence` converts at the boundary
- **Tailwind CSS**: built via `@tailwindcss/cli` (no PostCSS, no bundler). Output to `public/styles.css` (gitignored). `make css` for one-shot build, `make dev` runs watch mode alongside the Bun server.
