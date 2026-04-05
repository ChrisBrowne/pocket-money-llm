import { Elysia } from "elysia"
import type { Database } from "bun:sqlite"
import type { Config } from "../config"
import type { Session } from "../auth/session"
import { isOk, isErr } from "../shared/result"
import { exportBackup, parseBackupFile, restoreBackup } from "./commands"
import { RestoreSummaryPage, RestoreError } from "./views"
import { Layout } from "../shared/layout"

export function backupHandlers(db: Database, config: Config) {
  return new Elysia({ name: "backup-handlers" })
    .get("/backup/export", ({ session, set }: { session: Session; set: any }) => {
      const data = exportBackup(db)
      const json = JSON.stringify(data, null, 2)
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\.\d{3}Z$/, "")
      set.headers["content-type"] = "application/json"
      set.headers["content-disposition"] =
        `attachment; filename="pocket-money-${timestamp}.json"`
      return json
    })
    .post("/backup/restore/upload", async ({ body, session }: { body: unknown; session: Session }) => {
      // body comes as multipart form data with a file field
      const formBody = body as { file?: { arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string> } }
      if (!formBody.file) {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message="No file uploaded" />
          </Layout>
        )
      }

      let raw: unknown
      try {
        const text = await formBody.file.text()
        raw = JSON.parse(text)
      } catch {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message="Invalid JSON file" />
          </Layout>
        )
      }

      const parsed = parseBackupFile(raw)
      if (isErr(parsed)) {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message={parsed.error.message} />
          </Layout>
        )
      }

      // Encode the validated data as base64 for the hidden form field
      const encodedData = Buffer.from(JSON.stringify(parsed.value)).toString("base64")

      return (
        <RestoreSummaryPage
          sessionName={session.name}
          data={parsed.value}
          encodedData={encodedData}
        />
      )
    })
    .post("/backup/restore/confirm", ({ body, session, set }: { body: unknown; session: Session; set: any }) => {
      const formBody = body as { data?: string }
      const encoded = formBody.data?.trim() ?? ""

      let raw: unknown
      try {
        const json = Buffer.from(encoded, "base64").toString("utf-8")
        raw = JSON.parse(json)
      } catch {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message="Invalid restore data" />
          </Layout>
        )
      }

      // Re-parse with Zod before executing (two-step: never trust the hidden field)
      const parsed = parseBackupFile(raw)
      if (isErr(parsed)) {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message={parsed.error.message} />
          </Layout>
        )
      }

      const result = restoreBackup(db, parsed.value)
      if (isErr(result)) {
        return (
          <Layout title="Restore Error" sessionName={session.name}>
            <RestoreError message="Restore failed. Your data has not been changed." />
          </Layout>
        )
      }

      set.status = 302
      set.headers["location"] = "/"
      return ""
    })
}

export function backupApiHandlers(db: Database) {
  return new Elysia({ name: "backup-api-handlers" })
    .get("/backup", () => {
      return exportBackup(db)
    })
}
