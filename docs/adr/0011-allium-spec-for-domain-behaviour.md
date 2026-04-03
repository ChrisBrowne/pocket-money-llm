# ADR-0011: Allium spec for domain behaviour

## Status

Accepted

## Context

The app's behaviour was elicited through conversation. Without a formal record, the agreed behaviour lives only in chat history and risks drifting during implementation.

## Decision

Use an Allium specification (`pocket-money.allium`) as the canonical definition of domain behaviour. The spec is updated before implementation changes. The Allium tend and weed agents are used to maintain alignment between spec and code.

## Consequences
- Behaviour is formally specified and verifiable
- Implementation can be checked against the spec for drift
- The spec captures what the app does, not how — technology choices remain separate
- New behaviour requires a spec change first, keeping design and implementation in sync
