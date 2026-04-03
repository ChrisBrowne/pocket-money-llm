# ADR-0010: Tech stack: Bun, Elysia, TSX, HTMX

**Status**: Accepted

**Context**: The user wants a TypeScript backend with server-rendered templates and lightweight frontend interactivity. No SPA framework, no build pipeline complexity.

**Decision**: 
- **Runtime**: Bun (fast TypeScript runtime, built-in SQLite driver)
- **Framework**: Elysia (Bun-native web framework)
- **Templates**: TSX (type-safe server-side rendering)
- **Interactivity**: HTMX (HTML-over-the-wire, no client JS framework)

**Consequences**:
- Single language (TypeScript) across the entire stack
- Bun's built-in SQLite support means no external DB driver dependency
- TSX templates give compile-time checking of rendered HTML
- HTMX keeps the frontend simple — no client-side state management, no bundler
- The stack is lightweight enough to run comfortably in an LXC container
