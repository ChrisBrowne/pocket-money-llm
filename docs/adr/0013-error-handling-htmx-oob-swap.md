# ADR-0013: Error handling via HTMX OOB swap

**Status**: Accepted

**Context**: The app is server-rendered with HTMX. Errors need to reach the user as HTML. There are two fundamentally different kinds of failure:

1. **Domain outcomes**: validation errors, "child not found", business rule violations. These are expected, modelled as `Result.err` values, and the handler knows how to render an appropriate response (inline form errors, a "not found" partial, etc.). These are part of the normal request/response flow.

2. **Unexpected failures**: database connection lost, unhandled exception, programmer error. The application code doesn't anticipate these — they propagate as thrown exceptions.

Without a strategy, unexpected failures would either crash the request with no user feedback, or require try/catch blocks scattered through handler code.

**Decision**: Every page layout includes a generic error element (e.g. a toast or banner container). Elysia's top-level error handler catches unhandled exceptions and returns an HTMX out-of-band (OOB) swap targeting this element with a generic error message.

Application code (handlers, command handlers, domain functions) never catches exceptions for control flow. Domain errors flow through Result types. Only truly unexpected failures reach the catch-all.

**Consequences**:
- Clean separation: handlers only deal with `Result<T, E>` for domain cases, never try/catch
- Every page automatically gets error display capability from the layout
- A single place (the top-level handler) controls the error UX for unexpected failures
- The generic error element must be present in every page — this is a layout contract
- HTMX OOB swaps work regardless of which element triggered the original request, so the error displays correctly no matter where the failure originated
- Logging/alerting for unexpected errors has a single integration point
