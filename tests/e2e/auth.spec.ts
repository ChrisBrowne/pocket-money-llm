import { test, expect } from "@playwright/test"
import { login, resetDatabase } from "./helpers"

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
  })

  test("AuthorisedParentLogsIn", async ({ page }) => {
    await login(page, "topher@example.com")
    await page.goto("/")
    await expect(page.getByTestId("session-name")).toBeVisible()
    await expect(page.getByTestId("session-name")).toHaveText("topher")
  })

  test("UnauthenticatedVisitorRedirected", async ({ page }) => {
    // Clear cookies to ensure no session
    await page.context().clearCookies()
    await page.goto("/")
    // Should have been redirected to dev login
    await expect(page).toHaveURL(/\/dev\/login/)
  })

  test("ParentLogsOut", async ({ page }) => {
    await login(page, "topher@example.com")
    await page.goto("/")
    await page.getByTestId("logout-button").click()
    // After logout, should redirect to login
    await page.waitForURL("**/dev/login")
  })
})
