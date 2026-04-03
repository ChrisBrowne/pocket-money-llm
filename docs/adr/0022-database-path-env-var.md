# ADR-0022: Database file path via DATABASE_PATH env var

## Status

Accepted

## Context

The SQLite database file needs to live on the LXC's local filesystem (ADR-0003 — not on a network share, to avoid WAL mode issues). The location must be configurable between development (local project directory) and production (a path on the LXC filesystem). All other configuration is already provided via environment variables (ADR-0018).

## Decision

The database file path is set via the `DATABASE_PATH` environment variable. The app fails fast on startup if this variable is not set — there is no default.

In development, `.env` sets it to a path within the project directory (e.g. `./data/pocket-money.db`). The `data/` directory is gitignored. In production, the systemd unit sets it to a path on the LXC's local filesystem.

## Consequences

- Consistent with the env var convention (ADR-0018)
- No default means the app cannot accidentally start with an unintended database location
- The `data/` directory is gitignored — no risk of committing the database
- Development and production use different paths without code changes
