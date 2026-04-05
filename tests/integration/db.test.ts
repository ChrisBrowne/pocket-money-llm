import { describe, expect, test, afterEach } from "bun:test"
import { openDatabase } from "../../src/db"
import { Database } from "bun:sqlite"
import { unlinkSync } from "node:fs"

function freshDb(): { db: Database; path: string } {
  const path = `/tmp/pm-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  const db = openDatabase(path)
  return { db, path }
}

describe("database", () => {
  const dbs: { db: Database; path: string }[] = []

  function createDb() {
    const entry = freshDb()
    dbs.push(entry)
    return entry.db
  }

  afterEach(() => {
    for (const { db, path } of dbs) {
      db.close()
      try { unlinkSync(path) } catch {}
      try { unlinkSync(path + "-wal") } catch {}
      try { unlinkSync(path + "-shm") } catch {}
    }
    dbs.length = 0
  })

  test("children table exists", () => {
    const db = createDb()
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='children'")
      .all()
    expect(tables).toHaveLength(1)
  })

  test("transactions table exists", () => {
    const db = createDb()
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
      .all()
    expect(tables).toHaveLength(1)
  })

  test("foreign key constraint is enforced", () => {
    const db = createDb()
    expect(() => {
      db.run(
        `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
         VALUES ('nonexistent', 'deposit', 500, 'test', '2024-01-01T00:00:00.000Z', 'test@example.com')`,
      )
    }).toThrow()
  })

  test("CHECK constraint rejects zero amount", () => {
    const db = createDb()
    db.run("INSERT INTO children (name, created_at) VALUES ('Alice', '2024-01-01T00:00:00.000Z')")
    expect(() => {
      db.run(
        `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
         VALUES ('Alice', 'deposit', 0, 'test', '2024-01-01T00:00:00.000Z', 'test@example.com')`,
      )
    }).toThrow()
  })

  test("CHECK constraint rejects negative amount", () => {
    const db = createDb()
    db.run("INSERT INTO children (name, created_at) VALUES ('Alice', '2024-01-01T00:00:00.000Z')")
    expect(() => {
      db.run(
        `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
         VALUES ('Alice', 'deposit', -100, 'test', '2024-01-01T00:00:00.000Z', 'test@example.com')`,
      )
    }).toThrow()
  })

  test("CHECK constraint rejects invalid kind", () => {
    const db = createDb()
    db.run("INSERT INTO children (name, created_at) VALUES ('Alice', '2024-01-01T00:00:00.000Z')")
    expect(() => {
      db.run(
        `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
         VALUES ('Alice', 'transfer', 500, 'test', '2024-01-01T00:00:00.000Z', 'test@example.com')`,
      )
    }).toThrow()
  })

  test("ON DELETE CASCADE removes transactions when child is deleted", () => {
    const db = createDb()
    db.run("INSERT INTO children (name, created_at) VALUES ('Alice', '2024-01-01T00:00:00.000Z')")
    db.run(
      `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
       VALUES ('Alice', 'deposit', 500, 'test', '2024-01-01T00:00:00.000Z', 'test@example.com')`,
    )

    // Verify transaction exists
    const before = db.query("SELECT COUNT(*) as count FROM transactions").get() as { count: number }
    expect(before.count).toBe(1)

    // Delete child
    db.run("DELETE FROM children WHERE name = 'Alice'")

    // Transactions should be gone
    const after = db.query("SELECT COUNT(*) as count FROM transactions").get() as { count: number }
    expect(after.count).toBe(0)
  })

  test("schema creation is idempotent", () => {
    const entry = freshDb()
    dbs.push(entry)
    // Opening the same database again should not throw
    const db2 = openDatabase(entry.path)
    db2.close()
  })
})
