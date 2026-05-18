import { test, expect } from "@playwright/test";
import { login, addChild, resetDatabase } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
    await login(page);
  });

  test("NavigationMenuReachableFromAnySurface — Home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("menu-button")).toBeVisible();
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("menu-add-child")).toBeVisible();
    await expect(page.getByTestId("menu-backup")).toBeVisible();

    // Tapping Add child navigates to AddChild
    await page.getByTestId("menu-add-child").click();
    await expect(page).toHaveURL(/\/add-child$/);
    await expect(page.getByTestId("add-child-form")).toBeVisible();
  });

  test("NavigationMenuReachableFromAnySurface — ChildDetail", async ({
    page,
  }) => {
    await addChild(page, "Alice");
    await page.goto("/children/Alice");
    await expect(page.getByTestId("menu-button")).toBeVisible();
    await page.getByTestId("menu-button").click();

    // Tapping Backup navigates to Backup surface
    await page.getByTestId("menu-backup").click();
    await expect(page).toHaveURL(/\/backup$/);
    await expect(page.getByTestId("backup-export-section")).toBeVisible();
    await expect(page.getByTestId("backup-restore-section")).toBeVisible();
  });

  test("MenuToggleViaBurgerAndClose", async ({ page }) => {
    await page.goto("/");

    // Menu starts off-screen — not in viewport
    await expect(page.getByTestId("menu")).not.toBeInViewport();

    // Burger opens menu — now in viewport
    await page.getByTestId("menu-button").click();
    await expect(page.getByTestId("menu")).toBeInViewport();

    // Close button hides menu — back out of viewport
    await page.getByTestId("menu-close").click();
    await expect(page.getByTestId("menu")).not.toBeInViewport();
  });
});
