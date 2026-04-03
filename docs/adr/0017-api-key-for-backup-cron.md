# ADR-0017: API key for backup cron authentication

**Status**: Accepted

**Context**: The external cron job (ADR-0008) needs to call the export endpoint. It can't go through Google OAuth — there's no browser. Options: reuse an OAuth session token (fragile, expires), static API key (simple), or no auth relying on Tailscale as the security boundary.

**Decision**: A static API key, provided as an env var to the app and to the cron script. The backup API endpoint checks for this key in an `Authorization` header. The key is separate from the cookie-based session used by the UI.

**Consequences**:
- Cron job is a simple `curl` with an auth header
- API key is a single env var — easy to configure in the LXC
- Security relies on Tailscale (network-level) plus the API key (application-level) — defence in depth
- Key rotation means updating the env var in two places (app and cron) and restarting
- The key does not grant access to UI operations — it only authorises the export endpoint
