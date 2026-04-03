# ADR-0027: Environment variable catalogue and .env.example

## Status

Accepted

## Context

The app requires several environment variables for configuration (ADR-0018): database path, OAuth credentials, cookie secret, API key, allowed emails, and port. These are documented across multiple ADRs but there is no single reference listing all required variables. During implementation or deployment, a developer would need to piece together the list from scattered ADRs.

## Decision

Maintain a `.env.example` file in the project root as the canonical catalogue of all environment variables. The file lists every variable with a comment explaining its purpose, which ADR governs it, and whether it has a default. Values are left blank or set to obvious placeholders — no real secrets.

The Allium spec's `config` block cross-references the env var names alongside each config value.

The app fails fast on startup if any required variable is missing (ADR-0018). `.env.example` makes it obvious what needs to be set.

## Consequences

- Single reference for all env vars — no hunting through ADRs
- `.env.example` is committed to the repo; `.env` remains gitignored
- New developers (or future-you after 6 months) can `cp .env.example .env` and fill in values
- Adding a new env var means updating `.env.example` — the catalogue stays current
