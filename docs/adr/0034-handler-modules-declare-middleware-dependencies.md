# ADR-0034: Handler modules declare their middleware dependencies via `.use()`

## Status

Accepted

## Context

The session middleware (ADR-0026, `src/auth/session-middleware.ts`) uses Elysia's `.derive({ as: "scoped" }, ...)` to add a `session` property to the request context. Route handlers across three feature modules — children, transactions, backup — destructure `session` from their handler arguments and use it for rendering and audit logging.

Originally each handler module created its own fresh Elysia instance:

```ts
export function childrenHandlers(db, config) {
  return new Elysia({ name: "children-handlers" })
    .get("/", ({ session }: { session: Session }) => { ... })
}
```

The manual `{ session: Session }` annotation was a parameter type assertion telling TypeScript "this destructure shape is what I expect" — but it didn't actually add `session` to the Elysia context type. The composition happened externally in `src/index.tsx`:

```ts
app.group(
  "",
  (group) =>
    group.use(sessionMiddleware(config)).use(childrenHandlers(db, config)),
  // ...
);
```

At runtime this worked: Elysia merges contexts when plugins are chained, so `session` was present in the request context by the time inner handlers ran. But each plugin's _type signature_ was checked in isolation against its own (empty) context. `tsc --noEmit` rejected the destructures with eight identical errors across the three handler files.

The errors stayed latent because `make lint` had never been run in CI or routinely by hand — they only surfaced after `make lint` was extended to include `prettier --check` and tested as part of a formatting sweep.

Three fix shapes were considered:

1. **Manually parameterise the inner Elysia's context type** (`new Elysia<{ derive: { session: Session } }>(...)`). Possible but awkward — Elysia's generic surface is complex and getting the parameterisation right by hand is fragile.
2. **Restructure handler factories to plugin-function form** (`(db, config) => (app) => app.get(...)`). Works but loses the named-plugin encapsulation and pushes the type-coupling problem to the call site.
3. **Have each handler module `.use(sessionMiddleware(config))` directly inside**. Elysia dedupes plugins by name, so the middleware still only runs once per request even when multiple plugins declare the dependency.

## Decision

Every handler module that depends on context derived by another middleware plugin `.use()`s that middleware inside its own Elysia instance:

```ts
export function childrenHandlers(db: Database, config: Config) {
  return new Elysia({ name: "children-handlers" })
    .use(sessionMiddleware(config))
    .get("/", ({ session }) => { ... })
}
```

Two consequences flow from this:

- The handler module's Elysia context includes the derived properties at type-check time, so destructures need no manual annotations.
- Elysia's plugin name (`{ name: "session-middleware" }` already in place) provides deduplication. The middleware's runtime work (cookie verification, redirect, CSRF check) executes once per request, not once per consuming plugin.

The composition root (`src/index.tsx`) keeps `.use(sessionMiddleware(config))` on the protected group **only for endpoints defined inline on the group itself** (currently the `/auth/logout` endpoint). Handler modules brought in via `.use(...)` no longer rely on this outer composition for their session typing — they pull it in themselves.

## Consequences

- **Self-contained handler modules.** Every protected handler declares its session dependency at the top of its factory. Reading any one handler file is enough to understand what context it needs; no hidden dependency on composition order in `index.tsx`.
- **No manual destructure annotations.** Patterns like `({ session }: { session: Session })` and `({ set }: { set: any })` come out of handler module code. Elysia infers everything from the chain.
- **The session middleware's plugin name is now load-bearing.** Removing `{ name: "session-middleware" }` would cause the middleware to run multiple times per request. The name is what makes this pattern safe.
- **Future handler modules follow the same shape.** Any new module that needs session middleware (or any other context-deriving middleware) `.use()`s it inside. The pattern generalises: middleware that derives context should be `.use()`d by every plugin that consumes its output, with deduplication handled by Elysia's plugin name registry.
- **`make lint` is now green.** The type errors that this ADR fixes were the last remaining items blocking a clean lint, after the Prettier sweep and the branded-type test assertions.
- **The runtime behaviour is unchanged.** All 102 unit + integration tests pass; the deployed application authenticates exactly as before. This change is purely about closing the gap between the runtime contract and the type contract.
