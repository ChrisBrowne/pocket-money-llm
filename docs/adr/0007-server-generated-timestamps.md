# ADR-0007: Server-generated timestamps only

**Status**: Accepted

**Context**: Transactions could allow backdating (e.g. "I gave them money yesterday but forgot to log it") or always use the server time when the transaction is recorded.

**Decision**: Timestamps are always server-generated (`now`). No backdating. The transaction note field can capture context like "this was for yesterday."

**Consequences**:
- Simpler transaction creation — no date picker needed in the UI
- Ledger ordering is guaranteed to match insertion order
- Minor inaccuracy when logging late, but the note field covers this
