# ADR-0018: Configuration via environment variables

**Status**: Accepted

**Context**: The app needs runtime configuration: allowed email addresses, cookie signing secret, API key for backup, Google OAuth client ID/secret, and the port to listen on. Options include config files (JSON, TOML), a database table, or environment variables.

**Decision**: All configuration is provided via environment variables. A `.env` file is used for local development (Bun loads `.env` natively). In production, environment variables are set in the systemd service unit.

**Consequences**:
- No config file parsing or config module needed
- Secrets (signing key, API key, OAuth secret) never appear in version control
- `.env` is gitignored
- Adding a new config value means adding an env var — no schema migration
- The app fails fast on startup if required env vars are missing
