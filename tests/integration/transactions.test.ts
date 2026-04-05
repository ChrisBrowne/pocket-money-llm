import { describe, expect, test, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import { openDatabase } from "../../src/db"
import { addChild } from "../../src/children/commands"
import { deposit, withdraw, getChildDetail } from "../../src/transactions/commands"
import { parseChildName, parsePence } from "../../src/shared/types"
import { isOk, isErr, assertOk, isSome, isNone } from "../../src/shared/result"
import { ChildNotFoundError } from "../../src/children/commands"
import { unlinkSync } from "node:fs"

function freshDb(): { db: Database; path: string } {
  const path = `/tmp/pm-txn-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  return { db: openDatabase(path), path }
}

describe("transaction commands", () => {
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
  const twoQuid = assertOk(parsePence("2.00"))
  const tenQuid = assertOk(parsePence("10.00"))

  test("deposit increases balance", () => {
    const db = createDb()
    addChild(db, alice)
    const result = deposit(db, alice, fiveQuid, "weekly pocket money", "topher@example.com")
    expect(isOk(result)).toBe(true)

    const detail = assertOk({ ok: true, value: undefined } as any)
    const child = getChildDetail(db, "Alice")
    expect(isSome(child)).toBe(true)
    if (isSome(child)) {
      expect(child.value.child.balance).toBe(500)
    }
  })

  test("withdraw decreases balance", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "pocket money", "topher@example.com")
    withdraw(db, alice, twoQuid, "sweets", "topher@example.com")

    const child = getChildDetail(db, "Alice")
    if (isSome(child)) {
      expect(child.value.child.balance).toBe(300)
    }
  })

  test("negative balance is allowed (ADR-0004)", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, twoQuid, "pocket money", "topher@example.com")
    withdraw(db, alice, fiveQuid, "advance", "topher@example.com")

    const child = getChildDetail(db, "Alice")
    if (isSome(child)) {
      expect(child.value.child.balance).toBe(-300)
    }
  })

  test("transactions are ordered newest-first", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "first", "topher@example.com")
    deposit(db, alice, twoQuid, "second", "topher@example.com")

    const child = getChildDetail(db, "Alice")
    if (isSome(child)) {
      expect(child.value.transactions).toHaveLength(2)
      expect(child.value.transactions[0]!.note).toBe("second")
      expect(child.value.transactions[1]!.note).toBe("first")
    }
  })

  test("recorded_by is captured", () => {
    const db = createDb()
    addChild(db, alice)
    deposit(db, alice, fiveQuid, "test", "sarah@example.com")

    const child = getChildDetail(db, "Alice")
    if (isSome(child)) {
      expect(child.value.transactions[0]!.recordedBy).toBe("sarah@example.com")
    }
  })

  test("deposit to nonexistent child returns error", () => {
    const db = createDb()
    const bob = assertOk(parseChildName("Bob"))
    const result = deposit(db, bob, fiveQuid, "test", "topher@example.com")
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ChildNotFoundError)
    }
  })

  test("withdraw from nonexistent child returns error", () => {
    const db = createDb()
    const bob = assertOk(parseChildName("Bob"))
    const result = withdraw(db, bob, fiveQuid, "test", "topher@example.com")
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ChildNotFoundError)
    }
  })

  test("getChildDetail returns None for nonexistent child", () => {
    const db = createDb()
    expect(isNone(getChildDetail(db, "Nobody"))).toBe(true)
  })

  test("getChildDetail with no transactions shows zero balance", () => {
    const db = createDb()
    addChild(db, alice)
    const child = getChildDetail(db, "Alice")
    if (isSome(child)) {
      expect(child.value.child.balance).toBe(0)
      expect(child.value.transactions).toHaveLength(0)
    }
  })
})
