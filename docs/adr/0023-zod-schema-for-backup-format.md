# ADR-0023: Zod schema as the backup format contract

## Status

Accepted

## Context

The backup/restore format (`BackupData`) is the one data boundary where two independent systems must agree: the app produces JSON exports (consumed by the cron job for storage, and by the browser for manual download), and the app consumes JSON imports (uploaded by a parent through the UI for restore).

Backup files may sit on the network share for months before being used for a restore. The format must be stable, and changes must be caught early. Options considered:

1. **JSON Schema document** — a static specification separate from the code. Requires a validator library and risks drifting from the actual serialization.
2. **Zod schema** — a runtime schema that is simultaneously the parser, the TypeScript type (via `z.infer`), and the validation contract. Lives in the codebase as code.

## Decision

Use a Zod schema as the canonical definition of the backup format. The schema:

- **Parses** all incoming restore data at the boundary (parse, don't validate)
- **Derives** the TypeScript type via `z.infer<typeof BackupDataSchema>`
- **Validates** export output before it leaves the system (belt and braces)
- Uses **strict mode** (no `.passthrough()`) — extra fields are rejected on import, so the contract is enforced in both directions

The schema lives in the backup feature directory, prominently named and commented as the format contract. Integration tests round-trip export/restore with pinned fixture data to catch serialization drift.

No separate JSON Schema document is maintained.

## Consequences

- The format contract is code, not documentation — it cannot drift from the implementation
- Zod is a runtime dependency, but it's small and earns its place at this boundary
- `z.infer` eliminates the need to manually keep TypeScript types in sync with the format
- Strict parsing means old backup files that predate a format change will fail to parse with a clear error, rather than silently importing partial data
- Round-trip integration tests provide an additional safety net against accidental format changes
- If the format needs to evolve, the Zod schema makes the breaking change visible immediately in tests
