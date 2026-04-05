import { ok, err, type Result } from "./result"

// ChildName — trimmed, non-empty string.
// The name is the child's identity (PRIMARY KEY in the database).

declare const childNameBrand: unique symbol
export type ChildName = string & { readonly [childNameBrand]: true }

export function parseChildName(raw: string): Result<ChildName, Error> {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return err(new Error("Name is required"))
  }
  return ok(trimmed as ChildName)
}

// Pence — positive integer representing an amount in pence.
// Input is a pounds string (e.g. "5.00" → 500). Zero and negative rejected.

declare const penceBrand: unique symbol
export type Pence = number & { readonly [penceBrand]: true }

export function parsePence(raw: unknown): Result<Pence, Error> {
  const str = typeof raw === "string" ? raw : String(raw)
  const pounds = Number(str)

  if (!Number.isFinite(pounds)) {
    return err(new Error("Amount must be a number"))
  }

  const pence = Math.round(pounds * 100)

  if (pence <= 0) {
    return err(new Error("Amount must be greater than zero"))
  }

  return ok(pence as Pence)
}
