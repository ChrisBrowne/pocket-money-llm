# ADR-0005: Balance derived from transaction ledger

**Status**: Accepted

**Context**: A child's balance could be stored as a field updated on each transaction, or derived by summing the transaction ledger. Stored balances are faster to read but can drift from reality. Derived balances are always correct but require computation.

**Decision**: Balance is derived from the transaction ledger (sum of deposits minus withdrawals). There is no stored balance field.

**Consequences**:
- Single source of truth — the ledger is the balance
- No risk of balance/ledger drift
- Computation cost is negligible at this scale (handful of kids, few transactions per week)
- Export/restore only needs to preserve the ledger; balances reconstruct automatically
