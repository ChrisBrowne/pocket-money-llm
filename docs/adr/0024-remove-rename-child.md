# ADR-0024: Remove rename child feature

## Status

Accepted

## Context

The original spec included a `RenameChild` rule. On review, two concerns emerged:

1. **Backup identity**: The backup format uses `child_name` as the key linking transactions to children (ADR-0015). If a child is renamed and then a pre-rename backup is restored, the old name comes back. Rename doesn't rewrite backup history — it creates a subtle identity mismatch between live data and stored backups.

2. **Practical value**: For a small family, renaming a child is vanishingly unlikely. The realistic scenario is correcting a typo at creation time, which can be handled by removing the child (before any transactions exist) and re-adding with the correct name.

If a rename is genuinely needed after transactions exist, the workaround is: add the new child, deposit the old child's balance, remove the old child. Transaction history for the old name is lost, but can be preserved by exporting a backup first. For the truly determined, editing the backup JSON and restoring is an option.

## Decision

Remove the `RenameChild` rule from the Allium spec and the rename action from the `ChildDetail` surface.

## Consequences

- One fewer operation to implement, test, and maintain
- No name-identity confusion between live data and backups
- The `ChildDetail` surface is simpler — deposit, withdraw, remove
- The workaround for genuine renames is manual but adequate for the expected frequency (approximately never)
