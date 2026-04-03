# ADR-0026: Separate auth middleware for UI and backup API

## Status

Accepted

## Context

The app has two distinct actors with different authentication mechanisms:

- **AuthorisedParent** (UI): Authenticates via signed HTTP-only session cookie (ADR-0016). The cookie contains the parent's email, verified against `allowed_emails` on every request.
- **BackupAgent** (cron job): Authenticates via a static API key in the `Authorization` header (ADR-0017). No browser, no cookies.

These could share a single middleware that accepts "either cookie or API key", but that muddies the security model — a UI route should never accept an API key, and the backup endpoint should never accept a session cookie. Each mechanism has different failure modes and different error responses (redirect to login vs. 401 Unauthorized).

## Decision

Use two separate Elysia middleware groups:

1. **Session middleware** — applied to all UI route groups. Verifies the signed session cookie, checks the email against `allowed_emails`. On failure: redirects to Google OAuth login.
2. **API key middleware** — applied to the backup API route group. Checks the `Authorization` header against `config.backup_api_key`. On failure: returns 401 Unauthorized.

Elysia's `.group()` method makes this natural — UI routes and backup API routes live in separate groups, each with their own middleware.

## Consequences

- Clean separation of concerns — each auth mechanism is isolated
- No "accept either" ambiguity in the middleware
- UI routes cannot be accessed with an API key, and vice versa
- Each middleware returns the appropriate error response for its context (redirect vs. 401)
- Adding a new auth mechanism in the future (e.g. a webhook) would be a new group, not a modification to existing middleware
