# ADR-0029: Structured JSON logging with Pino

## Status

Accepted

## Context

The application needs logging for operational visibility — startup diagnostics, request errors, and unexpected failures caught by the top-level error handler (ADR-0013). Without a deliberate choice, logging defaults to unstructured `console.log` calls scattered through the code, which are hard to parse, filter, or forward to a log aggregator.

Options considered:

1. **console.log** — zero dependencies, but unstructured. No levels, no consistent format, no machine-parseable output.
2. **Pino** — structured JSON logger, fast, minimal API. The de facto standard in the Node/Bun ecosystem for production logging.
3. **Winston, Bunyan, etc.** — heavier, more configurable. Overkill for a 2-user family app.

## Decision

Use Pino for all application logging. Output is structured JSON — one JSON object per line, machine-parseable by default, human-readable in development via `pino-pretty`.

Logging conventions:

- **Startup**: log config summary (port, database path, dev mode status) at `info` level. Never log secrets (cookie secret, API key, OAuth credentials).
- **Top-level error handler**: log the error at `error` level with the full stack trace, then return the OOB swap HTML to the client.
- **Request logging**: use Elysia's lifecycle hooks or a logging plugin to log requests at `info` level (method, path, status, duration). Keep it minimal — no request body logging.
- **Application code**: avoid logging in domain functions (they're pure). Command handlers and infrastructure wrappers may log at `warn` or `error` when something unexpected happens. `console.log` is not used anywhere — all output goes through the Pino logger instance.

A single logger instance is created at startup and passed (or imported) where needed. No per-request child loggers unless a concrete need arises.

## Consequences

- All log output is structured JSON — trivial to pipe to jq, forward to a log aggregator, or parse programmatically
- `pino-pretty` in development gives human-readable coloured output without changing the code
- One dependency (`pino`), plus `pino-pretty` as a dev dependency
- `console.log` is banned in application code — linting can enforce this if desired
- The top-level error handler (ADR-0013) has a single integration point for error logging
- Request logging provides basic observability without custom instrumentation
