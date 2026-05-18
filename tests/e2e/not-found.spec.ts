import { test, expect } from "@playwright/test";
import { login, resetDatabase } from "./helpers";

test.describe("404 Not Found", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
    await login(page);
  });

  test("UnknownChildPathRendersNotFoundPage", async ({ page }) => {
    const response = await page.goto("/children/Ghost");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await expect(page.getByTestId("not-found-message")).toContainText("Ghost");
  });

  test("UnknownChildRemovePathRendersNotFoundPage", async ({ page }) => {
    const response = await page.goto("/children/Ghost/remove");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });

  test("UnmatchedUrlRendersNotFoundPage", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });

  test("NotFoundPageBackToHomeLinkWorks", async ({ page }) => {
    await page.goto("/children/Ghost");
    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await page.getByTestId("not-found-home").click();
    await page.waitForURL("/");
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });
});
