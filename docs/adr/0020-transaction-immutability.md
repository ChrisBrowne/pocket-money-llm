# ADR-0020: Transaction immutability — corrections via offsetting

## Status

Accepted

## Context

When a parent records a wrong amount or picks the wrong transaction type, there are two approaches to correction:

1. **Mutable transactions**: allow editing or deleting individual transactions. This requires edit/delete UI, audit trail decisions (do we keep the original?), and complicates the append-only ledger model.
2. **Immutable transactions**: transactions cannot be changed once recorded. Mistakes are corrected by adding an offsetting entry (e.g. a deposit to reverse an erroneous withdrawal) with a note explaining the correction.

The app tracks small amounts for a handful of children. Mistakes are infrequent. The transaction ledger is the single source of truth for balances (ADR-0005), so its integrity matters more than editing convenience.

## Decision

Transactions are immutable once recorded. There is no edit or delete operation for individual transactions. Corrections are made by adding a new offsetting transaction with an explanatory note.

The only way to remove transactions is by removing the child entirely (ADR-0006), which deletes all their transactions, or by restoring from a backup (ADR-0003).

## Consequences

- Simpler data model — no UPDATE or DELETE on transaction rows
- The ledger is a complete audit trail: mistakes and their corrections are both visible
- Correcting an error takes two taps (add an offsetting transaction) rather than one (edit in place) — acceptable given the low frequency of mistakes
- The transaction history tells the full story, which is arguably more honest than silently rewriting it
