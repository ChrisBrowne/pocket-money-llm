import { describe, expect, test } from "bun:test"
import { BackupDataSchema } from "../../src/backup/schema"

const validBackup = {
  children: [{ name: "Alice", created_at: "2024-01-01T00:00:00.000Z" }],
  transactions: [
    {
      child_name: "Alice",
      kind: "deposit" as const,
      amount: 500,
      note: "weekly pocket money",
      recorded_at: "2024-01-01T00:00:00.000Z",
      recorded_by: "topher@example.com",
    },
  ],
  exported_at: "2024-01-01T12:00:00.000Z",
}

describe("BackupDataSchema", () => {
  test("accepts valid backup data", () => {
    const result = BackupDataSchema.safeParse(validBackup)
    expect(result.success).toBe(true)
  })

  test("accepts empty backup", () => {
    const result = BackupDataSchema.safeParse({
      children: [],
      transactions: [],
      exported_at: "2024-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  test("rejects extra fields on root", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      colour: "blue",
    })
    expect(result.success).toBe(false)
  })

  test("rejects extra fields on child", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      children: [{ name: "Alice", created_at: "2024-01-01T00:00:00.000Z", colour: "blue" }],
    })
    expect(result.success).toBe(false)
  })

  test("rejects extra fields on transaction", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      transactions: [{ ...validBackup.transactions[0], colour: "blue" }],
    })
    expect(result.success).toBe(false)
  })

  test("rejects orphaned transactions (child_name not in children)", () => {
    const result = BackupDataSchema.safeParse({
      children: [{ name: "Alice", created_at: "2024-01-01T00:00:00.000Z" }],
      transactions: [
        {
          child_name: "Bob",
          kind: "deposit",
          amount: 500,
          note: "test",
          recorded_at: "2024-01-01T00:00:00.000Z",
          recorded_by: "topher@example.com",
        },
      ],
      exported_at: "2024-01-01T12:00:00.000Z",
    })
    expect(result.success).toBe(false)
  })

  test("rejects missing fields", () => {
    const result = BackupDataSchema.safeParse({ children: [] })
    expect(result.success).toBe(false)
  })

  test("rejects invalid transaction kind", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      transactions: [{ ...validBackup.transactions[0], kind: "transfer" }],
    })
    expect(result.success).toBe(false)
  })

  test("rejects zero amount", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      transactions: [{ ...validBackup.transactions[0], amount: 0 }],
    })
    expect(result.success).toBe(false)
  })

  test("rejects negative amount", () => {
    const result = BackupDataSchema.safeParse({
      ...validBackup,
      transactions: [{ ...validBackup.transactions[0], amount: -100 }],
    })
    expect(result.success).toBe(false)
  })
})
