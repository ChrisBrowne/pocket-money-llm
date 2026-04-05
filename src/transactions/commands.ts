import type { Database } from "bun:sqlite"
import { ok, err, some, none, type Result, type Option } from "../shared/result"
import { ChildNotFoundError, type ChildWithBalance } from "../children/commands"
import type { ChildName, Pence } from "../shared/types"

export interface TransactionRow {
  id: number
  childName: string
  kind: "deposit" | "withdrawal"
  amount: number
  note: string
  recordedAt: string
  recordedBy: string
}

export interface ChildDetail {
  child: ChildWithBalance
  transactions: TransactionRow[]
}

export function deposit(
  db: Database,
  childName: ChildName,
  amount: Pence,
  note: string,
  recordedBy: string,
): Result<void, ChildNotFoundError> {
  // Check child exists
  const child = db
    .query<{ name: string }, [string]>("SELECT name FROM children WHERE name = ?")
    .get(childName)
  if (!child) return err(new ChildNotFoundError(childName))

  db.run(
    `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
     VALUES (?, 'deposit', ?, ?, ?, ?)`,
    [childName, amount, note, new Date().toISOString(), recordedBy],
  )
  return ok(undefined)
}

export function withdraw(
  db: Database,
  childName: ChildName,
  amount: Pence,
  note: string,
  recordedBy: string,
): Result<void, ChildNotFoundError> {
  const child = db
    .query<{ name: string }, [string]>("SELECT name FROM children WHERE name = ?")
    .get(childName)
  if (!child) return err(new ChildNotFoundError(childName))

  db.run(
    `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
     VALUES (?, 'withdrawal', ?, ?, ?, ?)`,
    [childName, amount, note, new Date().toISOString(), recordedBy],
  )
  return ok(undefined)
}

export function getChildDetail(
  db: Database,
  name: string,
): Option<ChildDetail> {
  const childRow = db
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

  if (!childRow) return none()

  const transactions = db
    .query<
      {
        id: number
        child_name: string
        kind: string
        amount: number
        note: string
        recorded_at: string
        recorded_by: string
      },
      [string]
    >(
      `SELECT id, child_name, kind, amount, note, recorded_at, recorded_by
       FROM transactions
       WHERE child_name = ?
       ORDER BY recorded_at DESC, id DESC`,
    )
    .all(name)
    .map((row) => ({
      id: row.id,
      childName: row.child_name,
      kind: row.kind as "deposit" | "withdrawal",
      amount: row.amount,
      note: row.note,
      recordedAt: row.recorded_at,
      recordedBy: row.recorded_by,
    }))

  return some({
    child: {
      name: childRow.name,
      createdAt: childRow.created_at,
      balance: childRow.balance ?? 0,
    },
    transactions,
  })
}
