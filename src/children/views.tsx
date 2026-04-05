import { escapeHtml } from "@kitajs/html"
import { Layout } from "../shared/layout"
import { formatPence } from "../shared/currency"
import type { ChildWithBalance } from "./commands"

interface HomePageProps {
  sessionName: string
  children: ChildWithBalance[]
  defaultNote: string
}

export function HomePage({ sessionName, children, defaultNote }: HomePageProps) {
  return (
    <Layout title="Home" sessionName={sessionName}>
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Pocket Money Tracker</h1>

      <div id="add-child-errors" data-testid="add-child-errors"></div>

      <form
        hx-post="/children"
        hx-target="#children-list"
        hx-swap="innerHTML"
        data-testid="add-child-form"
        class="flex gap-2 mb-6"
      >
        <input
          type="text"
          name="name"
          placeholder="Child's name"
          required
          data-testid="add-child-input"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button type="submit" data-testid="add-child-button" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Add Child
        </button>
      </form>

      <div id="children-list" data-testid="children-list">
        <ChildrenList children={children} />
      </div>

      <div data-testid="backup-section" class="mt-8 pt-6 border-t border-gray-200">
        <div class="flex flex-col gap-3">
          <a href="/backup/export" data-testid="export-backup" class="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 underline">
            Export Backup
          </a>
          <form
            method="post"
            action="/backup/restore/upload"
            enctype="multipart/form-data"
            data-testid="restore-upload-form"
            class="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input type="file" name="file" accept=".json" required data-testid="restore-file-input" class="text-sm text-gray-500" />
            <button type="submit" data-testid="restore-upload-button" class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Restore from Backup
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

interface ChildrenListProps {
  children: ChildWithBalance[]
}

export function ChildrenList({ children }: ChildrenListProps) {
  if (children.length === 0) {
    return <EmptyState />
  }
  return (
    <div class="flex flex-col gap-3">
      {children.map((child) => (
        <ChildCard child={child} />
      ))}
    </div>
  )
}

export function EmptyState() {
  return (
    <p data-testid="empty-state" class="text-gray-500 text-sm py-8 text-center">
      No children yet. Add one above to get started.
    </p>
  )
}

interface ChildCardProps {
  child: ChildWithBalance
}

export function ChildCard({ child }: ChildCardProps) {
  const safeName = escapeHtml(child.name)
  const safeBalance = escapeHtml(formatPence(child.balance))
  const balanceColor = child.balance < 0 ? "text-red-600" : "text-green-700"

  return (
    <a
      href={`/children/${encodeURIComponent(child.name)}`}
      data-testid={`child-card-${safeName}`}
      class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all no-underline"
    >
      <span data-testid={`child-name-${safeName}`} class="font-medium text-gray-800">{safeName}</span>
      <span data-testid={`child-balance-${safeName}`} class={`font-mono font-semibold ${balanceColor}`}>
        {safeBalance}
      </span>
    </a>
  )
}

export function AddChildError({ message }: { message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div id="add-child-errors" hx-swap-oob="true" data-testid="add-child-errors">
      <p data-testid="add-child-error" class="text-sm text-red-600 mb-2">{safeMessage}</p>
    </div>
  )
}
