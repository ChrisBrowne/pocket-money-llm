import { z } from "zod"

const ChildSnapshotSchema = z.strictObject({
  name: z.string(),
  created_at: z.string(),
})

const TransactionSnapshotSchema = z.strictObject({
  child_name: z.string(),
  kind: z.enum(["deposit", "withdrawal"]),
  amount: z.number().int().positive(),
  note: z.string(),
  recorded_at: z.string(),
  recorded_by: z.string(),
})

export const BackupDataSchema = z
  .strictObject({
    children: z.array(ChildSnapshotSchema),
    transactions: z.array(TransactionSnapshotSchema),
    exported_at: z.string(),
  })
  .refine(
    (data) => {
      const childNames = new Set(data.children.map((c) => c.name))
      return data.transactions.every((t) => childNames.has(t.child_name))
    },
    { message: "Backup contains transactions referencing non-existent children" },
  )

export type BackupData = z.infer<typeof BackupDataSchema>
export type ChildSnapshot = z.infer<typeof ChildSnapshotSchema>
export type TransactionSnapshot = z.infer<typeof TransactionSnapshotSchema>
