import { escapeHtml } from "@kitajs/html"
import { Layout } from "../shared/layout"
import type { BackupData } from "./schema"

interface RestoreSummaryPageProps {
  sessionName: string
  data: BackupData
  encodedData: string
}

export function RestoreSummaryPage({
  sessionName,
  data,
  encodedData,
}: RestoreSummaryPageProps) {
  const safeChildCount = String(data.children.length)
  const safeTransactionCount = String(data.transactions.length)
  const safeExportedAt = escapeHtml(data.exported_at)
  const safeEncodedData = encodedData // base64, no user content

  return (
    <Layout title="Confirm Restore" sessionName={sessionName}>
      <h1>Restore Backup</h1>
      <div data-testid="restore-summary">
        <p>
          Children: <strong data-testid="restore-child-count">{safeChildCount}</strong>
        </p>
        <p>
          Transactions: <strong data-testid="restore-transaction-count">{safeTransactionCount}</strong>
        </p>
        <p>
          Exported at: <strong data-testid="restore-exported-at">{safeExportedAt}</strong>
        </p>
        <p>This will replace all existing data.</p>
        <form method="post" action="/backup/restore/confirm">
          <textarea name="data" style="display:none" data-testid="restore-data">
            {safeEncodedData}
          </textarea>
          <button type="submit" data-testid="restore-confirm-button">
            Confirm Restore
          </button>
          <a href="/" data-testid="restore-cancel">Cancel</a>
        </form>
      </div>
    </Layout>
  )
}

export function RestoreError({ message }: { message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div data-testid="restore-error">
      <p>{safeMessage}</p>
      <a href="/">Back to Home</a>
    </div>
  )
}
