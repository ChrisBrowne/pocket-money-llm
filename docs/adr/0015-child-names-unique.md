# ADR-0015: Child names are unique

**Status**: Accepted

**Context**: The backup/restore mechanism uses child names to reconnect transactions to children after a restore. If two children share a name, this lookup is ambiguous. Additionally, duplicate names would be confusing in the UI for a small family.

**Decision**: Child names must be unique. Adding or renaming a child to a name that already exists is rejected.

**Consequences**:
- Child name functions as a natural identifier within the app
- Backup/restore can reliably match transactions to children by name
- The parsed `ChildName` type enforces non-empty; the command handler checks uniqueness against the database
- Rename must also check for conflicts with existing names
