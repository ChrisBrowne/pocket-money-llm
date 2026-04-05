import { escapeHtml } from "@kitajs/html"
import { Layout } from "../shared/layout"
import { formatPence } from "../shared/currency"
import type { ChildWithBalance } from "../children/commands"
import type { TransactionRow } from "./commands"

interface ChildDetailPageProps {
  sessionName: string
  child: ChildWithBalance
  transactions: TransactionRow[]
  defaultNote: string
}

export function ChildDetailPage({
  sessionName,
  child,
  transactions,
  defaultNote,
}: ChildDetailPageProps) {
  const safeName = escapeHtml(child.name)

  return (
    <Layout title={child.name} sessionName={sessionName}>
      <div class="mb-6">
        <a href="/" class="text-sm text-gray-500 hover:text-gray-700 no-underline">&larr; Back</a>
      </div>

      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">{safeName}</h1>
        <BalanceDisplay balance={child.balance} />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <h2 class="text-sm font-medium text-gray-500 mb-3">Deposit</h2>
          <div id="deposit-errors" data-testid="deposit-errors"></div>
          <form
            hx-post={`/children/${encodeURIComponent(child.name)}/deposit`}
            hx-target="#transaction-list"
            hx-swap="afterbegin"
            data-testid="deposit-form"
            class="flex flex-col gap-2"
          >
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              placeholder="Amount (£)"
              required
              data-testid="deposit-amount"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="text"
              name="note"
              value={escapeHtml(defaultNote)}
              data-testid="deposit-note"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button type="submit" data-testid="deposit-button" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors">
              Deposit
            </button>
          </form>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <h2 class="text-sm font-medium text-gray-500 mb-3">Withdraw</h2>
          <div id="withdraw-errors" data-testid="withdraw-errors"></div>
          <form
            hx-post={`/children/${encodeURIComponent(child.name)}/withdraw`}
            hx-target="#transaction-list"
            hx-swap="afterbegin"
            data-testid="withdraw-form"
            class="flex flex-col gap-2"
          >
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              placeholder="Amount (£)"
              required
              data-testid="withdraw-amount"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="text"
              name="note"
              value={escapeHtml(defaultNote)}
              data-testid="withdraw-note"
              class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button type="submit" data-testid="withdraw-button" class="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors">
              Withdraw
            </button>
          </form>
        </div>
      </div>

      <div class="mb-6">
        <h2 class="text-sm font-medium text-gray-500 mb-3">Transactions</h2>
        <div id="transaction-list" data-testid="transaction-list" class="flex flex-col gap-2">
          {transactions.map((tx) => (
            <TransactionItem tx={tx} />
          ))}
        </div>
      </div>

      <div class="pt-6 border-t border-gray-200">
        <form
          hx-delete={`/children/${encodeURIComponent(child.name)}`}
          data-testid="remove-child-form"
        >
          <button type="submit" data-testid="remove-child-button" class="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors">
            Remove {safeName}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export function BalanceDisplay({ balance }: { balance: number }) {
  const safeBalance = escapeHtml(formatPence(balance))
  const balanceColor = balance < 0 ? "text-red-600" : "text-green-700"
  return (
    <div id="balance-display" data-testid="balance-display" class={`text-3xl font-mono font-bold ${balanceColor}`}>
      {safeBalance}
    </div>
  )
}

export function TransactionItem({ tx }: { tx: TransactionRow }) {
  const safeNote = escapeHtml(tx.note)
  const safeAmount = escapeHtml(formatPence(tx.amount))
  const safeRecordedBy = escapeHtml(tx.recordedBy)
  const safeKind = escapeHtml(tx.kind)
  const isDeposit = tx.kind === "deposit"
  const kindColor = isDeposit ? "text-green-700 bg-green-50" : "text-orange-700 bg-orange-50"
  const amountPrefix = isDeposit ? "+" : "-"

  return (
    <div data-testid={`transaction-${tx.id}`} class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 text-sm">
      <span data-testid={`tx-kind-${tx.id}`} class={`px-2 py-0.5 rounded text-xs font-medium ${kindColor}`}>{safeKind}</span>
      <span data-testid={`tx-amount-${tx.id}`} class={`font-mono font-semibold ${isDeposit ? "text-green-700" : "text-orange-700"}`}>{amountPrefix}{safeAmount}</span>
      <span data-testid={`tx-note-${tx.id}`} class="text-gray-600 flex-1 truncate">{safeNote}</span>
      <span data-testid={`tx-recorded-by-${tx.id}`} class="text-gray-400 text-xs hidden sm:inline">{safeRecordedBy}</span>
      <span data-testid={`tx-recorded-at-${tx.id}`} class="text-gray-400 text-xs hidden sm:inline">{escapeHtml(tx.recordedAt)}</span>
    </div>
  )
}

export function TransactionError({ formId, message }: { formId: string; message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div id={formId} hx-swap-oob="true" data-testid={formId}>
      <p data-testid={`${formId}-message`} class="text-sm text-red-600 mb-2">{safeMessage}</p>
    </div>
  )
}
