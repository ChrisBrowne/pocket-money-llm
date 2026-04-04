# Pocket Money Tracker

## Architecture Decision Records

When a design decision is made during conversation — whether about behaviour, technology, deployment, or trade-offs — propose an ADR and write it to `docs/adr/`. This applies to decisions that would affect future work, not trivial implementation choices.

ADRs follow the Nygard format (Context, Decision, Consequences) and are numbered sequentially. Update `docs/adr/README.md` when adding a new ADR.

If a decision supersedes a previous one, update the old ADR's status to "Superseded by ADR-NNNN" and link forward.

## Git Commits

Commit messages should focus on the *why* of the change, not the *what* — the diff already shows what changed. Include context from the design conversation that isn't obvious from the code alone: which ADR motivated the change, what trade-off was considered, what user need drove it. Reference ADRs by number (e.g. "per ADR-0004") when a commit implements or follows from a recorded decision.

## Allium Specification

The domain behaviour is specified in `pocket-money.allium` at the project root. When making changes to application behaviour, update the Allium spec first, then implement. Use the Allium skill for spec work and the tend/weed agents for maintenance.

## Tech Stack

- Runtime: Bun
- Backend framework: Elysia
- Templates: TSX
- Frontend interactivity: HTMX
- Styling: Tailwind CSS (see ADR-0010)
- Storage: SQLite (see ADR-0003)
- Logging: Pino (see ADR-0029)
- Deployment: Proxmox LXC

## Development Guidelines

### Makefile as the Developer Interface

Every developer workflow — install, run, test, lint, deploy, database reset — must be a Makefile target. If a developer needs to remember a specific command, flag combination, or sequence of steps, it belongs in the Makefile. Raw commands should not need to be typed from memory or copied from docs. When implementing a new feature that introduces a new workflow (e.g. a migration step, a new test suite), add the corresponding Makefile target in the same change.

### Architecture: Functional Core, Imperative Shell

Domain logic lives in pure functions — no side effects, no I/O, no dependencies. These are the core, and they are trivially unit testable.

Command handlers are the imperative shell — they orchestrate: call domain functions, talk to infrastructure (DB, filesystem), return results. They are thin glue, not a place for business logic.

HTTP handlers are thinner still. Their responsibility is:
1. Parse and validate request params (return error HTML immediately if invalid)
2. Call the command handler
3. Pass the result to a TSX view and return the HTML

### Parse, Don't Validate

Transform unstructured input into typed domain values at the boundary. A parsed type (e.g. `Amount`, `ChildName`) carries proof of its constraint — the domain never handles raw strings. The litmus test: if the type's constructor can reject invalid values, it's earning its keep. If it's just a label over `string` with no validation, it's ceremony — don't bother.

### Make Illegal States Unrepresentable

Lean on TypeScript's type system — discriminated unions, branded types, exhaustive switches. If the compiler can prevent a bug, prefer that over a runtime check.

### No Null Returns — Use Result or Option

Functions never return `null` or `undefined` to signal absence or failure. These are two distinct situations with distinct types:

- **Failure** (something went wrong): return a `Result<T, E>`. The `E` is always an `Error` subclass (see ADR-0012).
- **Absence** (nothing went wrong, but there's no value): return an `Option<T>` — a hand-rolled discriminated union (`{some: true, value: T} | {some: false}`) with the same shape as Result. Constructor functions `some(value)` and `none()`, type guards `isSome(option)` and `isNone(option)`.

This applies everywhere a function might "not have a value to return" — lookups that may miss, parse functions that may reject input, session verification that may find no valid session. The caller always handles the variant explicitly via type guards, never via null checks.

The litmus test: if you're about to write `: T | null` as a return type, use `Option<T>` instead. If you're about to write `: T | null` where null means "something failed", use `Result<T, E>` instead.

### Result Types at Infrastructure Boundaries

Result types live where things can genuinely fail — infrastructure calls (DB queries, file operations) and the command handlers that orchestrate them. The Result type is hand-rolled — a minimal discriminated union with `isOk`/`isErr` guards, `assertOk`/`assertErr` assertion functions for tests, and an `Error`-constrained error variant. No monadic bells and whistles, no library dependency (see ADR-0012).

Domain functions are pure and return plain values. If inputs are parsed and typed at the boundary, domain computation can't fail — there's nothing to wrap in a Result.

The layering:
- **Infrastructure wrappers** return `Result<T, E>` — they wrap try/catch around calls that genuinely fail
- **Command handlers** return `Result<T, E>` — they orchestrate infra calls (Results) and domain calls (plain values)
- **Domain functions** return plain values — pure computation, no failure mode
- **Handlers** inspect the command handler's Result and render HTML accordingly

Exceptions are never used for control flow. Try/catch exists only inside infrastructure wrappers to convert exceptions into Result values.

### Error Handling

Two categories, handled at different levels (see ADR-0013):

- **Expected outcomes** ("child not found", "duplicate name", and other state-dependent failures) are `Result.err` values returned by command handlers. Handlers render appropriate HTML for them — "not found" partials, contextual error messages, etc. These are part of the normal request flow. Note: param validation (missing fields, wrong types) is handled earlier — in the HTTP handler's parse step — and never reaches the command handler.
- **Unexpected failures** (unhandled exceptions that escaped a Result wrapper) are caught by Elysia's top-level error handler, which returns an HTMX OOB swap targeting a generic error element present in every page layout. Application code never catches exceptions for control flow.

### Functional Over Object-Oriented

Functions and data, not class hierarchies. No inheritance. Compose through function arguments. If a command handler needs a database handle, pass it as an argument — that's all the dependency injection needed.

### Colocation Over Abstraction

Keep related code together. Some duplication is preferable to indirection that forces jumping between files to follow the flow. Three similar lines of code is better than one clever abstraction.

Don't introduce abstractions (repositories, service layers, helper modules) until concrete evidence demands it. Premature abstraction is a code smell equal to duplication.

### Organise by Feature, Not by Layer

Code is organised into feature directories (e.g. `children/`, `transactions/`, `backup/`), not by technical role (`handlers/`, `controllers/`, `domain/`). Each feature contains its handler, command handler, domain functions, and views together. A developer working on a feature should find everything they need in one place.

### Testing

**Mocking is a code smell.** If you need a mock, you're either testing at the wrong level or the code has a coupling problem. Move the logic into a pure function, or test it at the integration/e2e level.

Three test layers, each at its natural seam:

- **Pure domain functions → unit tests.** No mocks needed, they're pure. Fast, numerous, cheap.
- **Command handlers → integration tests.** Real SQLite, real filesystem. Each test gets a fresh database.
- **User-visible features → Playwright e2e tests.** All happy paths must be covered. If `docs/scenarios.md` exists, use it as the source of truth for what e2e tests to write — each scenario maps to at least one test.

Infrastructure is never mocked. We own our infrastructure and tests run against the real thing.

#### Playwright E2E Conventions

**Test isolation**: All Playwright tests run in parallel. Every test must be fully independent — it creates its own state (add children, record transactions) and never relies on state left by another test. Each test worker uses its own SQLite database file to eliminate any possibility of cross-test interference.

**DOM selectors — data-testid only**: All Playwright selectors use `data-testid` attributes, never CSS classes, tag names, or DOM structure. This decouples tests from visual design and HTML structure — elements can be freely moved, restyled, or restructured without breaking tests. The TSX views are responsible for placing `data-testid` attributes on every interactive and assertable element. Use descriptive, kebab-case names (e.g. `data-testid="child-card-alice"`, `data-testid="deposit-form"`, `data-testid="balance-display"`).
