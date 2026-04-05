import { test, expect } from "@playwright/test"
import { login, addChild, depositTo, withdrawFrom, resetDatabase } from "./helpers"

test.describe("Child Detail — Viewing", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await login(page)
  })

  test("ViewChildDetailShowsBalanceAndHistory", async ({ page }) => {
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "5.00", "weekly pocket money")
    await depositTo(page, "Alice", "5.00", "weekly pocket money")
    await withdrawFrom(page, "Alice", "3.00", "comic book")

    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£7.00")
    // Should have 3 transactions
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(3)
  })

  test("ViewChildDetailWithNoTransactions", async ({ page }) => {
    await addChild(page, "Alice")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£0.00")
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(0)
  })
})

test.describe("Child Detail — Deposits", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
  })

  test("DepositIncreasesBalance", async ({ page }) => {
    await depositTo(page, "Alice", "5.00")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£5.00")
  })

  test("DepositUpdatesBalanceInPlace", async ({ page }) => {
    // Seed an initial balance via API so we start at £5.00
    await depositTo(page, "Alice", "5.00")
    // Open the detail page in the browser
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£5.00")
    // Submit deposit via the browser form (exercises HTMX OOB swap)
    await page.getByTestId("deposit-amount").fill("2.50")
    await page.getByTestId("deposit-button").click()
    // Balance should update in place without a page reload
    await expect(page.getByTestId("balance-display")).toContainText("£7.50")
    // New transaction should appear at the top of the list
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(2)
  })

  test("DepositUsesDefaultNote", async ({ page }) => {
    // Don't change the note — should use the pre-filled default
    await page.goto("/children/Alice")
    await page.getByTestId("deposit-amount").fill("5.00")
    await page.getByTestId("deposit-button").click()
    await page.waitForTimeout(200)
    // The transaction should show the default note
    const txNote = page.locator("[data-testid^='tx-note-']").first()
    await expect(txNote).toContainText("weekly pocket money")
  })

  test("DepositWithCustomNote", async ({ page }) => {
    await depositTo(page, "Alice", "10.00", "birthday money from gran")
    await page.goto("/children/Alice")
    const txNote = page.locator("[data-testid^='tx-note-']").first()
    await expect(txNote).toContainText("birthday money from gran")
  })

  test("DepositWithEmptyNote", async ({ page }) => {
    await depositTo(page, "Alice", "5.00", "")
    await page.goto("/children/Alice")
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(1)
  })

  test("DepositRejectsZeroAmount", async ({ page }) => {
    const response = await page.request.post("/children/Alice/deposit", {
      form: { amount: "0", note: "test" },
    })
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain("greater than zero")
  })

  test("DepositRejectsNegativeAmount", async ({ page }) => {
    const response = await page.request.post("/children/Alice/deposit", {
      form: { amount: "-5.00", note: "test" },
    })
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain("greater than zero")
  })
})

test.describe("Child Detail — Withdrawals", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
  })

  test("WithdrawalDecreasesBalance", async ({ page }) => {
    await depositTo(page, "Alice", "5.00")
    await withdrawFrom(page, "Alice", "2.00", "sweets")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£3.00")
  })

  test("WithdrawalUpdatesBalanceInPlace", async ({ page }) => {
    await depositTo(page, "Alice", "5.00")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£5.00")
    // Submit withdrawal via the browser form (exercises HTMX OOB swap)
    await page.getByTestId("withdraw-amount").fill("2.00")
    await page.getByTestId("withdraw-note").fill("sweets")
    await page.getByTestId("withdraw-button").click()
    // Balance should update in place without a page reload
    await expect(page.getByTestId("balance-display")).toContainText("£3.00")
    // New transaction should appear
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(2)
  })

  test("WithdrawalCanGoNegative", async ({ page }) => {
    await depositTo(page, "Alice", "2.00")
    await withdrawFrom(page, "Alice", "5.00", "advance on next week")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("-£3.00")
  })

  test("WithdrawalFromZeroBalance", async ({ page }) => {
    await withdrawFrom(page, "Alice", "1.00", "ice cream")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("-£1.00")
  })
})

test.describe("Child Detail — Correcting Mistakes", () => {
  test("CorrectMistakeWithOffsettingTransaction", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "3.00")
    // Oops: recorded £5 withdrawal instead of £2
    await withdrawFrom(page, "Alice", "5.00", "shoes")
    // Correct: deposit £5 back, then withdraw £2
    await depositTo(page, "Alice", "5.00", "correction: shoes was £2 not £5")
    await withdrawFrom(page, "Alice", "2.00", "shoes (corrected)")
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£1.00")
    // All 4 transactions should be visible
    const transactions = page.locator("[data-testid^='transaction-']:not([data-testid='transaction-list'])")
    await expect(transactions).toHaveCount(4)
  })
})

test.describe("Child Detail — Removing a Child", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await login(page)
  })

  test("RemoveChildDeletesEverything", async ({ page }) => {
    await addChild(page, "Bob")
    await depositTo(page, "Bob", "5.00")
    await page.goto("/children/Bob")
    await page.getByTestId("remove-child-button").click()
    await page.waitForURL("/")
    await expect(page.getByTestId("child-card-Bob")).not.toBeVisible()
  })

  test("RemoveChildWithNoTransactions", async ({ page }) => {
    await addChild(page, "Boob") // typo
    await page.goto("/children/Boob")
    await page.getByTestId("remove-child-button").click()
    await page.waitForURL("/")
    await expect(page.getByTestId("child-card-Boob")).not.toBeVisible()
  })

  test("RemoveChildWithNegativeBalance", async ({ page }) => {
    await addChild(page, "Bob")
    await withdrawFrom(page, "Bob", "3.00", "advance")
    await page.goto("/children/Bob")
    await page.getByTestId("remove-child-button").click()
    await page.waitForURL("/")
    await expect(page.getByTestId("child-card-Bob")).not.toBeVisible()
  })
})

test.describe("Audit Trail", () => {
  test("TransactionRecordsWhichParentActed", async ({ page }) => {
    await resetDatabase(page)
    await login(page, "topher@example.com")
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "5.00")

    // Log in as sarah and deposit
    await login(page, "sarah@example.com")
    await depositTo(page, "Alice", "5.00")

    await page.goto("/children/Alice")
    const recordedBys = page.locator("[data-testid^='tx-recorded-by-']")
    await expect(recordedBys).toHaveCount(2)
    // Newest first: sarah then topher
    await expect(recordedBys.first()).toContainText("sarah@example.com")
    await expect(recordedBys.last()).toContainText("topher@example.com")
  })
})

test.describe("Multi-Child Isolation", () => {
  test("TransactionsAreIsolatedPerChild", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await addChild(page, "Bob")
    await depositTo(page, "Alice", "5.00")
    await depositTo(page, "Bob", "3.00")
    await depositTo(page, "Alice", "2.00")

    // Check Alice: £7.00
    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£7.00")

    // Check Bob: £3.00 (unchanged by Alice's deposits)
    await page.goto("/children/Bob")
    await expect(page.getByTestId("balance-display")).toContainText("£3.00")
  })
})

test.describe("Currency Display", () => {
  test("AmountsDisplayedAsPoundsAndPence", async ({ page }) => {
    await resetDatabase(page)
    await login(page)
    await addChild(page, "Alice")
    await depositTo(page, "Alice", "0.50", "found in sofa")
    await depositTo(page, "Alice", "10.00", "birthday")
    await depositTo(page, "Alice", "15.25", "chores")

    await page.goto("/children/Alice")
    await expect(page.getByTestId("balance-display")).toContainText("£25.75")

    // Check individual transaction amounts
    const amounts = page.locator("[data-testid^='tx-amount-']")
    await expect(amounts).toHaveCount(3)
    // Newest first: chores, birthday, sofa
    await expect(amounts.nth(0)).toContainText("£15.25")
    await expect(amounts.nth(1)).toContainText("£10.00")
    await expect(amounts.nth(2)).toContainText("£0.50")
  })
})
