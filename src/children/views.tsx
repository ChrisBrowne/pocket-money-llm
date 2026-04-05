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
      <h1>Pocket Money Tracker</h1>

      <div id="add-child-errors" data-testid="add-child-errors"></div>

      <form
        hx-post="/children"
        hx-target="#children-list"
        hx-swap="innerHTML"
        data-testid="add-child-form"
      >
        <input
          type="text"
          name="name"
          placeholder="Child's name"
          required
          data-testid="add-child-input"
        />
        <button type="submit" data-testid="add-child-button">
          Add Child
        </button>
      </form>

      <div id="children-list" data-testid="children-list">
        <ChildrenList children={children} />
      </div>

      <div data-testid="backup-section">
        <a href="/backup/export" data-testid="export-backup">Export Backup</a>
        <form
          method="post"
          action="/backup/restore/upload"
          enctype="multipart/form-data"
          data-testid="restore-upload-form"
        >
          <input type="file" name="file" accept=".json" required data-testid="restore-file-input" />
          <button type="submit" data-testid="restore-upload-button">
            Restore from Backup
          </button>
        </form>
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
    <>
      {children.map((child) => (
        <ChildCard child={child} />
      ))}
    </>
  )
}

export function EmptyState() {
  return (
    <p data-testid="empty-state">
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
  const balanceClass = child.balance < 0 ? "negative" : ""

  return (
    <div data-testid={`child-card-${safeName}`}>
      <a href={`/children/${encodeURIComponent(child.name)}`}>
        <span data-testid={`child-name-${safeName}`}>{safeName}</span>
        <span
          data-testid={`child-balance-${safeName}`}
          class={balanceClass}
        >
          {safeBalance}
        </span>
      </a>
    </div>
  )
}

export function AddChildError({ message }: { message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div id="add-child-errors" hx-swap-oob="true" data-testid="add-child-errors">
      <p data-testid="add-child-error">{safeMessage}</p>
    </div>
  )
}
