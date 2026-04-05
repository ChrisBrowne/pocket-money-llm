import { describe, expect, test, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import { openDatabase } from "../../src/db"
import { addChild } from "../../src/children/commands"
import { deposit } from "../../src/transactions/commands"
import { exportBackup, parseBackupFile, restoreBackup } from "../../src/backup/commands"
import { parseChildName, parsePence } from "../../src/shared/types"
import { isOk, isErr, assertOk } from "../../src/shared/result"
import { unlinkSync } from "node:fs"

function freshDb(): { db: Database; path: string } {
  const path = `/tmp/pm-backup-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  return { db: openDatabase(path), path }
}

describe("backup commands", () => {
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

  const alice = assertOk(parseChildName("Alice"))
  const fiveQuid = assertOk(parsePence("5.00"))

  test("exportBackup produces valid data", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "test", "topher@example.com")

    const backup = exportBackup(db)
    expect(backup.children).toHaveLength(1)
    expect(backup.children[0]!.name).toBe("Alice")
    expect(backup.transactions).toHaveLength(1)
    expect(backup.transactions[0]!.amount).toBe(500)
    expect(backup.exported_at).toBeTruthy()
  })

  test("exportBackup with empty database", () => {
    const db = createDb()
    const backup = exportBackup(db)
    expect(backup.children).toHaveLength(0)
    expect(backup.transactions).toHaveLength(0)
  })

  test("parseBackupFile accepts valid data", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "test", "topher@example.com")
    const backup = exportBackup(db)

    const result = parseBackupFile(backup)
    expect(isOk(result)).toBe(true)
  })

  test("parseBackupFile rejects invalid data", () => {
    const result = parseBackupFile({ bad: "data" })
    expect(isErr(result)).toBe(true)
  })

  test("parseBackupFile rejects orphaned transactions", () => {
    const result = parseBackupFile({
      children: [],
      transactions: [
        {
          child_name: "Nobody",
          kind: "deposit",
          amount: 500,
          note: "test",
          recorded_at: "2024-01-01T00:00:00.000Z",
          recorded_by: "test@example.com",
        },
      ],
      exported_at: "2024-01-01T00:00:00.000Z",
    })
    expect(isErr(result)).toBe(true)
  })

  test("restoreBackup wipes and replaces data", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "original", "topher@example.com")

    const backupData = {
      children: [{ name: "Bob", created_at: "2024-01-01T00:00:00.000Z" }],
      transactions: [
        {
          child_name: "Bob",
          kind: "deposit" as const,
          amount: 300,
          note: "restored",
          recorded_at: "2024-01-01T00:00:00.000Z",
          recorded_by: "sarah@example.com",
        },
      ],
      exported_at: "2024-01-01T12:00:00.000Z",
    }

    const result = restoreBackup(db, backupData)
    expect(isOk(result)).toBe(true)

    // Alice should be gone
    const children = db.query("SELECT name FROM children").all() as { name: string }[]
    expect(children).toHaveLength(1)
    expect(children[0]!.name).toBe("Bob")

    // Only Bob's transaction
    const txns = db.query("SELECT * FROM transactions").all() as any[]
    expect(txns).toHaveLength(1)
    expect(txns[0]!.note).toBe("restored")
  })

  test("round-trip: export then restore is stable", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "weekly pocket money", "topher@example.com")

    const exported = exportBackup(db)
    const result = restoreBackup(db, exported)
    expect(isOk(result)).toBe(true)

    const reExported = exportBackup(db)
    expect(reExported.children).toEqual(exported.children)
    expect(reExported.transactions).toEqual(exported.transactions)
  })

  test("restoreBackup with empty data wipes everything", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "test", "topher@example.com")

    const emptyBackup = {
      children: [],
      transactions: [],
      exported_at: "2024-01-01T00:00:00.000Z",
    }

    restoreBackup(db, emptyBackup)
    const children = db.query("SELECT name FROM children").all()
    expect(children).toHaveLength(0)
  })
})
