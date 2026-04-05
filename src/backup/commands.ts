import type { Database } from "bun:sqlite"
import { ok, err, type Result } from "../shared/result"
import { BackupDataSchema, type BackupData } from "./schema"

export function exportBackup(db: Database): BackupData {
  const children = db
    .query<{ name: string; created_at: string }, []>(
      "SELECT name, created_at FROM children ORDER BY name",
    )
    .all()

  const transactions = db
    .query<
      {
        child_name: string
        kind: string
        amount: number
        note: string
        recorded_at: string
        recorded_by: string
      },
      []
    >("SELECT child_name, kind, amount, note, recorded_at, recorded_by FROM transactions ORDER BY id")
    .all()
    .map((row) => ({
      child_name: row.child_name,
      kind: row.kind as "deposit" | "withdrawal",
      amount: row.amount,
      note: row.note,
      recorded_at: row.recorded_at,
      recorded_by: row.recorded_by,
    }))

  return {
    children,
    transactions,
    exported_at: new Date().toISOString(),
  }
}

export function parseBackupFile(raw: unknown): Result<BackupData, Error> {
  const result = BackupDataSchema.safeParse(raw)
  if (!result.success) {
    return err(new Error(`Invalid backup file: ${result.error.message}`))
  }
  return ok(result.data)
}

export function restoreBackup(db: Database, data: BackupData): Result<void, Error> {
  try {
    db.run("BEGIN TRANSACTION")

    // Wipe all existing data
    db.run("DELETE FROM transactions")
    db.run("DELETE FROM children")

    // Insert children
    const insertChild = db.prepare(
      "INSERT INTO children (name, created_at) VALUES (?, ?)",
    )
    for (const child of data.children) {
      insertChild.run(child.name, child.created_at)
    }

    // Insert transactions
    const insertTx = db.prepare(
      `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    for (const tx of data.transactions) {
      insertTx.run(tx.child_name, tx.kind, tx.amount, tx.note, tx.recorded_at, tx.recorded_by)
    }

    db.run("COMMIT")
    return ok(undefined)
  } catch (e: unknown) {
    db.run("ROLLBACK")
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}
