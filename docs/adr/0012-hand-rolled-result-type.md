# ADR-0012: Hand-rolled Result type

**Status**: Accepted

**Context**: Infrastructure calls (database queries, file operations) can genuinely fail. These failures need to be represented as values, not thrown exceptions, so that command handlers can compose them and HTTP handlers can render appropriate responses.

Domain functions are pure — if inputs are parsed and typed at the boundary, domain computation can't fail. Result types are unnecessary in the domain layer.

Options for the Result type range from hand-rolling a minimal type to adopting a library like `neverthrow` or `ts-results`. Libraries bring monadic operations (`.map`, `.flatMap`, `.match`) and broader API surfaces. The user has hand-rolled Result types on multiple TypeScript projects and found that a minimal implementation — just the discriminated union and a couple of type guards — covers the need without pulling in dependencies or encouraging over-abstraction of error handling.

**Decision**: Hand-roll a minimal Result type. The implementation is:

- A discriminated union: `{ok: true, value: T} | {ok: false, error: E}` (or similar)
- Constructor functions: `ok(value)` and `err(error)`
- Type guard functions: `isOk(result)` and `isErr(result)`
- No `.map`, `.flatMap`, `.match`, or other monadic operations

Result types appear at infrastructure boundaries and in command handler return types. Domain functions return plain values.

The API surface stays small and the code reads as idiomatic TypeScript — standard `if`/`else` branching on the discriminant, not method chains.

**Consequences**:
- Zero dependencies for error handling
- Every developer (and AI assistant) can read the implementation in seconds
- Error paths use normal TypeScript control flow (`if (isErr(result)) return ...`)
- Domain functions stay clean — no Result wrapping for pure computation
- Infrastructure wrappers are the only place try/catch exists, converting exceptions into Result values
- If monadic operations turn out to be genuinely useful later, they can be added — but the bar is "concrete need" not "nice to have"
