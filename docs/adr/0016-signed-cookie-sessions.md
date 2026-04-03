# ADR-0016: Signed HTTP-only cookie sessions

## Status

Accepted

## Context

After Google OAuth authenticates a user, the app needs to know who they are on subsequent requests. Options range from server-side session stores (Redis, SQLite sessions table) to stateless signed cookies.

For a 2-user app on a private Tailnet, a server-side session store is unnecessary infrastructure. A signed cookie containing the user's email and display name is sufficient — the app verifies the signature and checks the email against the whitelist on each request.

## Decision

Sessions are stateless signed HTTP-only cookies. The cookie contains the authenticated user's email and display name (from the Google profile), signed with a secret key (`COOKIE_SECRET` env var). No backend session store. No expiry — the session lives until the cookie is cleared. The app verifies the signature and checks the email against `allowed_emails` on every request.

## Consequences
- No session storage infrastructure (no Redis, no sessions table)
- Stateless — the app can restart without invalidating sessions
- HTTP-only flag prevents JavaScript access to the cookie (XSS mitigation)
- "Logging out" means clearing the cookie client-side
- Revoking access means removing the email from `allowed_emails` and redeploying — acceptable for 2 users
- The cookie signing secret must be stable across restarts (env var)
- No session ID to revoke server-side — if the cookie is compromised, the only remediation is rotating the signing secret
