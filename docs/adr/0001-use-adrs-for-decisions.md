# ADR-0001: Use ADRs for decision recording

**Status**: Accepted

**Context**: This project is being designed through conversational sessions. Decisions made in one conversation risk being lost or re-litigated in the next. We need a durable, version-controlled record of what was decided and why.

**Decision**: Use Architecture Decision Records (Nygard format) stored in `docs/adr/`. Every decision that affects future work gets an ADR. Claude is instructed via `CLAUDE.md` to propose ADRs when decisions are made.

**Consequences**:
- Decisions are discoverable by anyone reading the repo
- The "why" is preserved alongside the "what", preventing future re-litigation
- Slightly more overhead per decision, but the record pays for itself quickly
- Superseded decisions remain visible (status updated, linked forward)
