# ADR-0021: Parent is session identity, not a stored entity

## Status

Accepted

## Context

The original Allium spec modelled `Parent` as an entity with `email` and `name` fields, and included an `OnlyAllowedParents` invariant quantifying over a `Parents` collection. However, nothing in the application creates, stores, or queries Parent records:

- Authentication is handled by Google OAuth (ADR-0002)
- The session cookie holds the authenticated email (ADR-0016)
- Authorisation checks compare the session email against `allowed_emails` config
- Every rule already has a `requires: session.email in config.allowed_emails` precondition

The `Parent` entity and `OnlyAllowedParents` invariant implied a stored collection that doesn't exist and would serve no purpose — the auth check on every request already prevents unauthorised access.

The parent's display name (for "Welcome, Topher" in the UI header) comes from the Google OAuth profile, not from a database record.

## Decision

`Parent` is not a stored entity. It is replaced by a `Session` value type representing the data held in the signed cookie: `email` (from OAuth, checked against `allowed_emails`) and `name` (from the Google profile, used for display).

The `OnlyAllowedParents` invariant is removed — it was asserting a constraint on a non-existent collection. The per-request auth middleware and per-rule `requires` clauses are the real enforcement.

Actor declarations (`AuthorisedParent`, `BackupAgent`) now reference `Session` instead of `Parent`.

## Consequences

- No parents table in the database — one fewer entity to manage
- The session cookie stores both email and name, signed with the cookie secret (ADR-0016)
- The parent's display name is populated at login from the Google OAuth profile and persists for the session lifetime
- If Google profile names change, the app picks it up on next login — no stale data
- Each transaction records the acting parent's email for audit purposes (ADR-0025)
