import { test, expect } from "./fixtures";
import { login, addChild, resetDatabase } from "./helpers";

test.describe("Home — Viewing Children", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
    await login(page);
  });

  test("HomeShowsEmptyStateWhenNoChildren", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  test("HomeShowsAllChildrenWithBalances", async ({ page }) => {
    await addChild(page, "Alice");
    await addChild(page, "Bob");
    await page.goto("/");
    await expect(page.getByTestId("child-card-Alice")).toBeVisible();
    await expect(page.getByTestId("child-card-Bob")).toBeVisible();
    await expect(page.getByTestId("child-balance-Alice")).toHaveText("£0.00");
    await expect(page.getByTestId("child-balance-Bob")).toHaveText("£0.00");
  });
});

test.describe("AddChild — Adding a Child", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
    await login(page);
  });

  test("AddChildWithEmptyBalance", async ({ page }) => {
    await addChild(page, "Alice");
    await expect(page.getByTestId("child-card-Alice")).toBeVisible();
    await expect(page.getByTestId("child-balance-Alice")).toHaveText("£0.00");
  });

  test("AddChildRejectsDuplicateName", async ({ page }) => {
    await addChild(page, "Alice");
    // Try adding duplicate — go back to add-child page
    await page.goto("/add-child");
    await page.getByTestId("add-child-input").fill("Alice");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("add-child-error")).toBeVisible();
    await expect(page.getByTestId("add-child-error")).toContainText(
      "already exists",
    );
  });

  test("AddChildRejectsEmptyName", async ({ page }) => {
    await page.goto("/add-child");
    await page.getByTestId("add-child-input").fill("   ");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("add-child-error")).toBeVisible();
    await expect(page.getByTestId("add-child-error")).toContainText("required");
  });

  test("AddChildTrimsWhitespace", async ({ page }) => {
    await page.goto("/add-child");
    await page.getByTestId("add-child-input").fill("  Alice  ");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("child-card-Alice")).toBeVisible();
  });
});
