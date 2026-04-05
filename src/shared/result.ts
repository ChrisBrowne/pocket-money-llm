// Result<T, E> — discriminated union for operations that can fail.
// Used at infrastructure boundaries and command handlers (ADR-0012).

export type Result<T, E extends Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function isOk<T, E extends Error>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

export function isErr<T, E extends Error>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}

export function assertOk<T, E extends Error>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`Expected Ok, got Err: ${result.error.message}`)
  }
  return result.value
}

export function assertErr<T, E extends Error>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error(`Expected Err, got Ok`)
  }
  return result.error
}

// Option<T> — discriminated union for absence (not failure).
// Same shape as Result for consistency.

export type Option<T> =
  | { readonly some: true; readonly value: T }
  | { readonly some: false }

export function some<T>(value: T): Option<T> {
  return { some: true, value }
}

export function none(): Option<never> {
  return { some: false }
}

export function isSome<T>(
  option: Option<T>,
): option is { readonly some: true; readonly value: T } {
  return option.some
}

export function isNone<T>(
  option: Option<T>,
): option is { readonly some: false } {
  return !option.some
}
