# ADR-0025: Record acting parent email on transactions

## Status

Accepted

## Context

Both parents have access to the app. When reviewing the transaction ledger, there's no way to tell who recorded a particular transaction. With only two users this is a minor concern, but the information is freely available in the session at recording time and costs nothing to store.

The session holds both `email` (stable identity from Google OAuth) and `name` (display name from Google profile). The email is the authoritative identifier used for auth checks (ADR-0002, ADR-0016). The display name can change if the Google profile is updated and is a denormalization concern.

## Decision

Record the acting parent's email address on each transaction in a `recorded_by` field. Email only — no display name.

The backup format (`TransactionSnapshot`) includes `recorded_by` so the audit trail survives export/restore.

## Consequences

- Every transaction records who created it — a lightweight audit trail
- Email is stable and unambiguous for two users
- Display can resolve "topher@example.com" to "Topher" at the view layer if needed, using the session or a simple mapping
- The `Transaction` entity and `TransactionSnapshot` value both gain a `recorded_by: String` field
- The Zod backup schema (ADR-0023) must include `recorded_by`
