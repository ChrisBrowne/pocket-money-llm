import type { Page } from "@playwright/test"

export async function login(page: Page, email = "topher@example.com") {
  // POST to dev login to get a session cookie
  await page.request.post("/dev/login", {
    form: { email },
  })
}

export async function resetDatabase(page: Page) {
  // Log in first (needed for session auth), then restore empty backup to wipe all data
  await login(page)
  const emptyBackup = {
    children: [],
    transactions: [],
    exported_at: new Date().toISOString(),
  }
  const encoded = Buffer.from(JSON.stringify(emptyBackup)).toString("base64")
  await page.request.post("/backup/restore/confirm", {
    form: { data: encoded },
  })
}

export async function addChild(page: Page, name: string) {
  await page.goto("/")
  await page.getByTestId("add-child-input").fill(name)
  await page.getByTestId("add-child-button").click()
  await page.waitForSelector(`[data-testid="child-card-${name}"]`)
}

export async function depositTo(
  page: Page,
  childName: string,
  amount: string,
  note?: string,
) {
  // Use API request to deposit (avoids HTMX dependency in tests)
  await page.request.post(`/children/${encodeURIComponent(childName)}/deposit`, {
    form: { amount, note: note ?? "weekly pocket money" },
  })
}

export async function withdrawFrom(
  page: Page,
  childName: string,
  amount: string,
  note?: string,
) {
  await page.request.post(`/children/${encodeURIComponent(childName)}/withdraw`, {
    form: { amount, note: note ?? "" },
  })
}
