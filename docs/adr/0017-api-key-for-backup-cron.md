# ADR-0017: API key for backup cron authentication

## Status

Accepted

## Context

The external cron job (ADR-0008) needs to call the export endpoint. It can't go through Google OAuth — there's no browser. Options: reuse an OAuth session token (fragile, expires), static API key (simple), or no auth relying on Tailscale as the security boundary.

## Decision

A static API key (`BACKUP_API_KEY` env var), provided to both the app and the cron script. The backup API endpoint checks for this key in an `Authorization` header. The backup API routes use their own middleware group, separate from cookie-based session auth (ADR-0026).

## Consequences

- Cron job is a simple `curl` with an auth header
- API key is a single env var — easy to configure in the LXC
- Security relies on Tailscale (network-level) plus the API key (application-level) — defence in depth
- Key rotation means updating the env var in two places (app and cron) and restarting
- The key does not grant access to UI operations — it only authorises the export endpoint
