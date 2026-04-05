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
  const safeEncodedData = encodedData

  return (
    <Layout title="Confirm Restore" sessionName={sessionName}>
      <div class="mb-6">
        <a href="/" class="text-sm text-gray-500 hover:text-gray-700 no-underline">&larr; Back</a>
      </div>

      <h1 class="text-2xl font-bold text-gray-800 mb-6">Restore Backup</h1>

      <div data-testid="restore-summary" class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="space-y-2 mb-6">
          <p class="text-sm text-gray-600">
            Children: <strong data-testid="restore-child-count" class="text-gray-800">{safeChildCount}</strong>
          </p>
          <p class="text-sm text-gray-600">
            Transactions: <strong data-testid="restore-transaction-count" class="text-gray-800">{safeTransactionCount}</strong>
          </p>
          <p class="text-sm text-gray-600">
            Exported at: <strong data-testid="restore-exported-at" class="text-gray-800">{safeExportedAt}</strong>
          </p>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
          <p class="text-sm text-amber-800">This will replace all existing data.</p>
        </div>

        <form method="post" action="/backup/restore/confirm" class="flex items-center gap-3">
          <textarea name="data" style="display:none" data-testid="restore-data">
            {safeEncodedData}
          </textarea>
          <button type="submit" data-testid="restore-confirm-button" class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">
            Confirm Restore
          </button>
          <a href="/" data-testid="restore-cancel" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors no-underline">Cancel</a>
        </form>
      </div>
    </Layout>
  )
}

export function RestoreError({ message }: { message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div data-testid="restore-error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-sm text-red-700 mb-3">{safeMessage}</p>
      <a href="/" class="text-sm text-red-600 hover:text-red-800 underline">Back to Home</a>
    </div>
  )
}
