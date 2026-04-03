# ADR-0006: Hard delete for child removal

**Status**: Accepted

**Context**: Removing a child from the app could be a soft delete (hidden but recoverable) or a hard delete (gone permanently). In practice, this operation is unlikely — it exists mainly for correcting mistakes or renaming (which is now a separate operation).

**Decision**: Hard delete. Removing a child deletes the child and all their transactions permanently.

**Consequences**:
- Simpler data model — no soft-delete flags or filtering
- Deletion is irreversible without a backup (export before deleting if unsure)
- The backup/restore mechanism provides the safety net if something is deleted by mistake
