import { test, expect } from "@playwright/test"
import { login, addChild, depositTo, resetDatabase } from "./helpers"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

test.describe("Backup — Export", () => {
  test("ExportBackupViaBrowser", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "5.00")

    // Use the API to verify export content (browser download is a regular <a> link)
    const response = await page.request.get("/backup/export")
    expect(response.status()).toBe(200)
    const contentDisposition = response.headers()["content-disposition"]
    expect(contentDisposition).toMatch(/^attachment; filename="pocket-money-.*\.json"$/)
    const content = await response.json()
    expect(content.children).toHaveLength(1)
    expect(content.children[0].name).toBe("Alice")
    expect(content.transactions).toHaveLength(1)
    expect(content.exported_at).toBeTruthy()
  })

  test("ExportBackupEmptyDatabase", async ({ page }) => {
    await resetDatabase(page)
    await login(page)

    const response = await page.request.get("/backup/export")
    const content = await response.json()
    expect(content.children).toHaveLength(0)
    expect(content.transactions).toHaveLength(0)
  })
})

test.describe("Backup — Restore", () => {
  test("RestoreShowsConfirmationBeforeExecuting", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "5.00")

    // Create a backup file to upload
    const backupData = {
      children: [{ name: "Bob", created_at: "2024-01-01T00:00:00.000Z" }],
      transactions: [
        { child_name: "Bob", kind: "deposit", amount: 300, note: "restored", recorded_at: "2024-01-01T00:00:00.000Z", recorded_by: "sarah@example.com" },
        { child_name: "Bob", kind: "deposit", amount: 200, note: "extra", recorded_at: "2024-01-02T00:00:00.000Z", recorded_by: "sarah@example.com" },
        { child_name: "Bob", kind: "withdrawal", amount: 100, note: "spent", recorded_at: "2024-01-03T00:00:00.000Z", recorded_by: "sarah@example.com" },
      ],
      exported_at: "2024-01-15T12:00:00.000Z",
    }
    const tmpFile = path.join(os.tmpdir(), `test-backup-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(backupData))

    await page.goto("/")
    await page.getByTestId("restore-file-input").setInputFiles(tmpFile)
    await page.getByTestId("restore-upload-button").click()

    // Should show summary
    await expect(page.getByTestId("restore-summary")).toBeVisible()
    await expect(page.getByTestId("restore-child-count")).toHaveText("1")
    await expect(page.getByTestId("restore-transaction-count")).toHaveText("3")

    // Alice should still exist (not yet confirmed)
    // Confirm
    await page.getByTestId("restore-confirm-button").click()
    await page.waitForURL("/")

    // Alice should be gone, Bob should exist
    await expect(page.getByTestId("child-card-Alice")).not.toBeVisible()
    await expect(page.getByTestId("child-card-Bob")).toBeVisible()

    fs.unlinkSync(tmpFile)
  })

  test("RestoreRejectsInvalidFile", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")

    const tmpFile = path.join(os.tmpdir(), `test-invalid-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, "not valid json{{{")

    await page.goto("/")
    await page.getByTestId("restore-file-input").setInputFiles(tmpFile)
    await page.getByTestId("restore-upload-button").click()

    await expect(page.getByTestId("restore-error")).toBeVisible()

    // Navigate back — Alice should still exist
    await page.goto("/")
    await expect(page.getByTestId("child-card-Alice")).toBeVisible()

    fs.unlinkSync(tmpFile)
  })

  test("RestoreRejectsExtraFields", async ({ page }) => {
    await resetDatabase(page)
    await login(page)

    const backupData = {
      children: [{ name: "Alice", created_at: "2024-01-01T00:00:00.000Z", colour: "blue" }],
      transactions: [],
      exported_at: "2024-01-15T12:00:00.000Z",
    }
    const tmpFile = path.join(os.tmpdir(), `test-extra-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(backupData))

    await page.goto("/")
    await page.getByTestId("restore-file-input").setInputFiles(tmpFile)
    await page.getByTestId("restore-upload-button").click()

    await expect(page.getByTestId("restore-error")).toBeVisible()

    fs.unlinkSync(tmpFile)
  })

  test("RestoreRejectsOrphanedTransactions", async ({ page }) => {
    await resetDatabase(page)
    await login(page)

    const backupData = {
      children: [{ name: "Alice", created_at: "2024-01-01T00:00:00.000Z" }],
      transactions: [
        { child_name: "Bob", kind: "deposit", amount: 500, note: "orphaned", recorded_at: "2024-01-01T00:00:00.000Z", recorded_by: "test@example.com" },
      ],
      exported_at: "2024-01-15T12:00:00.000Z",
    }
    const tmpFile = path.join(os.tmpdir(), `test-orphan-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(backupData))

    await page.goto("/")
    await page.getByTestId("restore-file-input").setInputFiles(tmpFile)
    await page.getByTestId("restore-upload-button").click()

    await expect(page.getByTestId("restore-error")).toBeVisible()

    fs.unlinkSync(tmpFile)
  })

  test("RestoreFromEmptyBackup", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "5.00")

    const backupData = {
      children: [],
      transactions: [],
      exported_at: "2024-01-15T12:00:00.000Z",
    }
    const tmpFile = path.join(os.tmpdir(), `test-empty-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(backupData))

    await page.goto("/")
    await page.getByTestId("restore-file-input").setInputFiles(tmpFile)
    await page.getByTestId("restore-upload-button").click()
    await page.getByTestId("restore-confirm-button").click()
    await page.waitForURL("/")

    await expect(page.getByTestId("empty-state")).toBeVisible()

    fs.unlinkSync(tmpFile)
  })
})
