import { ok, err, type Result } from "./result";

// ChildName — trimmed, non-empty string.
// The name is the child's identity (PRIMARY KEY in the database).

declare const childNameBrand: unique symbol;
export type ChildName = string & { readonly [childNameBrand]: true };

export function parseChildName(raw: string): Result<ChildName, Error> {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return err(new Error("Name is required"));
  }
  return ok(trimmed as ChildName);
}

// Birthday — ISO date string in YYYY-MM-DD form. Date-only, no time component.
// Rejects malformed input, future dates, and impossibly old dates (>150 years).
//
// Stored as TEXT in SQLite to match the codebase's ISO-string convention
// (see Transaction.recorded_at, Child.created_at).

declare const birthdayBrand: unique symbol;
export type Birthday = string & { readonly [birthdayBrand]: true };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBirthday(raw: unknown): Result<Birthday, Error> {
  const str = typeof raw === "string" ? raw.trim() : "";
  if (str === "") {
    return err(new Error("Date of birth is required"));
  }
  if (!ISO_DATE.test(str)) {
    return err(new Error("Date of birth must be in YYYY-MM-DD format"));
  }
  // Native input[type=date] always emits valid calendar dates, but a hand-
  // crafted request can sneak through anything matching the regex.
  const parsed = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return err(new Error("Date of birth is not a real date"));
  }
  // Round-trip check rejects e.g. "2025-02-30" which JS silently accepts as
  // March 2nd. If the input doesn't survive the round-trip it wasn't a real
  // calendar date.
  const roundTrip = parsed.toISOString().slice(0, 10);
  if (roundTrip !== str) {
    return err(new Error("Date of birth is not a real date"));
  }
  const now = Date.now();
  if (parsed.getTime() > now) {
    return err(new Error("Date of birth cannot be in the future"));
  }
  const oneHundredFiftyYears = 150 * 365.25 * 24 * 60 * 60 * 1000;
  if (now - parsed.getTime() > oneHundredFiftyYears) {
    return err(new Error("Date of birth is implausibly long ago"));
  }
  return ok(str as Birthday);
}

// Pence — positive integer representing an amount in pence.
// Input is a pounds string (e.g. "5.00" → 500). Zero and negative rejected.

declare const penceBrand: unique symbol;
export type Pence = number & { readonly [penceBrand]: true };

export function parsePence(raw: unknown): Result<Pence, Error> {
  const str = typeof raw === "string" ? raw : String(raw);
  const pounds = Number(str);

  if (!Number.isFinite(pounds)) {
    return err(new Error("Amount must be a number"));
  }

  const pence = Math.round(pounds * 100);

  if (pence <= 0) {
    return err(new Error("Amount must be greater than zero"));
  }

  return ok(pence as Pence);
}
