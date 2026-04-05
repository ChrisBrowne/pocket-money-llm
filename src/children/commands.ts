import type { Database } from "bun:sqlite"
import { ok, err, some, none, type Result, type Option } from "../shared/result"
import type { ChildName } from "../shared/types"

export class DuplicateChildError extends Error {
  constructor(name: string) {
    super(`A child named "${name}" already exists`)
    this.name = "DuplicateChildError"
  }
}

export class ChildNotFoundError extends Error {
  constructor(name: string) {
    super(`Child "${name}" not found`)
    this.name = "ChildNotFoundError"
  }
}

export interface ChildWithBalance {
  name: string
  createdAt: string
  balance: number
}

export function addChild(
  db: Database,
  name: ChildName,
): Result<void, DuplicateChildError> {
  try {
    db.run("INSERT INTO children (name, created_at) VALUES (?, ?)", [
      name,
      new Date().toISOString(),
    ])
    return ok(undefined)
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return err(new DuplicateChildError(name))
    }
    throw e
  }
}

export function removeChild(
  db: Database,
  name: ChildName,
): Result<void, ChildNotFoundError> {
  const result = db.run("DELETE FROM children WHERE name = ?", [name])
  if (result.changes === 0) {
    return err(new ChildNotFoundError(name))
  }
  return ok(undefined)
}

export function listChildren(db: Database): ChildWithBalance[] {
  return db
    .query<
      { name: string; created_at: string; balance: number | null },
      []
    >(
      `SELECT c.name, c.created_at,
              COALESCE(SUM(CASE WHEN t.kind = 'deposit' THEN t.amount ELSE -t.amount END), 0) AS balance
       FROM children c
       LEFT JOIN transactions t ON t.child_name = c.name
       GROUP BY c.name
       ORDER BY c.name`,
    )
    .all()
    .map((row) => ({
      name: row.name,
      createdAt: row.created_at,
      balance: row.balance ?? 0,
    }))
}

export function getChild(
  db: Database,
  name: string,
): Option<ChildWithBalance> {
  const row = db
    .query<
      { name: string; created_at: string; balance: number | null },
      [string]
    >(
      `SELECT c.name, c.created_at,
              COALESCE(SUM(CASE WHEN t.kind = 'deposit' THEN t.amount ELSE -t.amount END), 0) AS balance
       FROM children c
       LEFT JOIN transactions t ON t.child_name = c.name
       WHERE c.name = ?
       GROUP BY c.name`,
    )
    .get(name)

  if (!row) return none()

  return some({
    name: row.name,
    createdAt: row.created_at,
    balance: row.balance ?? 0,
  })
}
