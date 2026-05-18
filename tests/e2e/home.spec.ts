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
    await page.getByTestId("add-child-dob").fill("2016-06-15");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("add-child-error")).toBeVisible();
    await expect(page.getByTestId("add-child-error")).toContainText(
      "already exists",
    );
  });

  test("AddChildRejectsEmptyName", async ({ page }) => {
    await page.goto("/add-child");
    await page.getByTestId("add-child-input").fill("   ");
    await page.getByTestId("add-child-dob").fill("2015-04-12");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("add-child-error")).toBeVisible();
    await expect(page.getByTestId("add-child-error")).toContainText("required");
  });

  test("AddChildTrimsWhitespace", async ({ page }) => {
    await page.goto("/add-child");
    await page.getByTestId("add-child-input").fill("  Alice  ");
    await page.getByTestId("add-child-dob").fill("2015-04-12");
    await page.getByTestId("add-child-button").click();
    await expect(page.getByTestId("child-card-Alice")).toBeVisible();
  });

  test("AddChildRejectsMissingDob", async ({ page, baseURL }) => {
    // HTML5 `required` would normally block submission, so we bypass the
    // browser form to exercise the server-side parseBirthday rejection.
    const response = await page.request.post(`${baseURL}/children`, {
      form: { name: "Alice", dob: "" },
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Date of birth is required");
  });

  test("AddChildRejectsInvalidDob", async ({ page, baseURL }) => {
    const response = await page.request.post(`${baseURL}/children`, {
      form: { name: "Alice", dob: "2099-01-01" },
    });
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Date of birth cannot be in the future");
  });
});

test.describe("Home — Children Ordering", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
    await login(page);
  });

  test("ChildrenAreOrderedByDobThenName", async ({ page }) => {
    // Add in a deliberately-scrambled order: youngest first, oldest last,
    // plus two with the same dob to exercise the alphabetical tie-break.
    await addChild(page, "Charlie", "2020-01-01");
    await addChild(page, "Bob", "2015-04-12");
    await addChild(page, "Alice", "2015-04-12"); // same dob as Bob
    await addChild(page, "Dora", "2010-07-30"); // oldest

    await page.goto("/");
    // Read the rendered order from the kids list.
    const names = await page
      .locator("[data-testid^='child-name-']")
      .allTextContents();
    // Expected: Dora (oldest, 2010), then Alice & Bob (2015, alpha-tied),
    // then Charlie (youngest, 2020).
    expect(names).toEqual(["Dora", "Alice", "Bob", "Charlie"]);
  });
});
