# ADR-0028: Dev-mode authentication bypass

## Status

Accepted

## Context

The app authenticates parents via Google OAuth (ADR-0002). This requires a Google Cloud project with OAuth credentials, a reachable callback URL, and internet access. For local development on a laptop — and for Playwright e2e tests — this is unnecessary friction. The developer cannot meaningfully work on the app without first setting up Google Cloud credentials and handling the OAuth redirect flow.

The app is deployed on a private Tailnet (ADR-0009), so the risk of an accidental bypass in production is bounded by network-level access control.

## Decision

A `DEV_MODE` environment variable activates a local authentication bypass. When `DEV_MODE=true`:

1. **Google OAuth env vars are not required.** The app skips registration of the Google OAuth routes (`/auth/google`, `/auth/callback`). `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` may be omitted.

2. **A `/dev/login` route is registered.** It presents the emails from `ALLOWED_EMAILS` as clickable options. Selecting one sets the same signed session cookie (ADR-0016) that Google OAuth would produce, then redirects to Home.

3. **The session middleware redirects to `/dev/login` instead of Google OAuth** when no valid session cookie is present.

4. **Everything downstream is identical.** The cookie format, signature verification, email whitelist check, `recorded_by` on transactions — all unchanged. The only difference is how the initial session cookie is obtained.

5. **The app logs a prominent warning at startup** when dev mode is active, e.g. `⚠ DEV_MODE active — authentication bypass enabled, do not use in production`.

When `DEV_MODE` is unset or false, the `/dev/login` route does not exist — it is never registered, not just hidden behind a guard.

## Consequences

- Local development requires no Google Cloud project, no OAuth credentials, and no internet
- Playwright tests can POST to `/dev/login` with an email to obtain a session cookie — no need to automate a Google login page
- Tests can exercise both parent identities to verify the `recorded_by` audit trail
- `ALLOWED_EMAILS` and `COOKIE_SECRET` remain required in dev mode — the whitelist and cookie signing are still exercised
- Risk of accidental production use is mitigated by: the startup warning, the Tailnet boundary, and the explicit opt-in env var
- `.env.example` (ADR-0027) must be updated to document `DEV_MODE`
