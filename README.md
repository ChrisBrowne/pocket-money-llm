# Pocket Money Tracker

A family web app for tracking children's pocket money. Parents log in, add children, record deposits and withdrawals, and watch balances update in real time. Every transaction is immutable — mistakes are corrected with offsetting entries, giving a complete audit trail.

Built with Bun, Elysia, HTMX, and SQLite. Server-rendered TSX with Tailwind CSS. No client-side JavaScript framework — just HTML over the wire.

## Features

- **Children** — add and remove children, each with a derived balance
- **Deposits and withdrawals** — record transactions with notes, balance updates live via HTMX
- **Negative balances** — parents can "sub" kids against future pocket money
- **Audit trail** — every transaction records which parent acted
- **Backup and restore** — export to JSON, restore with two-step confirmation, strict Zod schema validation
- **Google OAuth** — email whitelist for authorised parents only
- **Dev mode** — bypass OAuth for local development with a single env var

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- [Playwright browsers](https://playwright.dev/) (for e2e tests only): `bunx playwright install chromium`

### Setup

```sh
# Clone and install
git clone git@github.com:ChrisBrowne/pocket-money-llm.git
cd pocket-money-llm
make install

# Create your local .env from the template
cp .env.example .env
```

Edit `.env` with your values. For local development, the minimum is:

```sh
DATABASE_PATH=./data/pocket-money.db
COOKIE_SECRET=any-random-string
BACKUP_API_KEY=any-random-string
ALLOWED_EMAILS=your@email.com
DEV_MODE=true
```

With `DEV_MODE=true`, Google OAuth credentials are not required.

### Run

```sh
make dev
```

This starts the Bun server with hot reload and Tailwind CSS in watch mode. Visit `http://localhost:3000` (or whatever `PORT` you set in `.env`).

You'll see a dev login page — click your email to log in.

### Test

```sh
make test        # unit + integration tests
make test-e2e    # Playwright end-to-end tests
make lint        # TypeScript type checking
```

### All Makefile targets

| Target | Description |
|--------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start dev server with hot reload + CSS watch |
| `make build` | Build CSS for production |
| `make start` | Build and start production server |
| `make test` | Run unit and integration tests |
| `make test-unit` | Run unit tests only |
| `make test-integration` | Run integration tests only |
| `make test-e2e` | Run Playwright e2e tests |
| `make lint` | Type check with `tsc --noEmit` |
| `make clean` | Remove built CSS, databases, and test artifacts |
| `make db-reset` | Delete local database files |
| `make deploy` | Print deployment instructions |

## Project Structure

```
pocket-money.allium          Domain behaviour specification
docs/adr/                    Architecture Decision Records (30)
docs/scenarios.md            E2E test scenarios (given/when/then)
docs/plans/                  Implementation plan
src/
  shared/                    Result/Option types, branded types, currency formatting, layout
  auth/                      Session cookies, middleware, Google OAuth, dev login
  children/                  Home page — add/remove/list children
  transactions/              Child detail — deposits, withdrawals, history
  backup/                    Export, restore, Zod schema
tests/
  unit/                      Pure function tests
  integration/               Command handler tests with real SQLite
  e2e/                       Playwright browser tests
```

## Documentation

- **[ADRs](docs/adr/README.md)** — 30 architecture decision records capturing every design choice and its rationale
- **[Scenarios](docs/scenarios.md)** — concrete given/when/then examples for every user flow
- **[Allium Spec](pocket-money.allium)** — formal domain behaviour specification
- **[CLAUDE.md](CLAUDE.md)** — development guidelines and conventions
