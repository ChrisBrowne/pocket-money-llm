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
      <h1>{safeName}</h1>

      <BalanceDisplay balance={child.balance} />

      <div id="deposit-errors" data-testid="deposit-errors"></div>
      <form
        hx-post={`/children/${encodeURIComponent(child.name)}/deposit`}
        hx-target="#transaction-list"
        hx-swap="afterbegin"
        data-testid="deposit-form"
      >
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          placeholder="Amount (£)"
          required
          data-testid="deposit-amount"
        />
        <input
          type="text"
          name="note"
          value={escapeHtml(defaultNote)}
          data-testid="deposit-note"
        />
        <button type="submit" data-testid="deposit-button">
          Deposit
        </button>
      </form>

      <div id="withdraw-errors" data-testid="withdraw-errors"></div>
      <form
        hx-post={`/children/${encodeURIComponent(child.name)}/withdraw`}
        hx-target="#transaction-list"
        hx-swap="afterbegin"
        data-testid="withdraw-form"
      >
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          placeholder="Amount (£)"
          required
          data-testid="withdraw-amount"
        />
        <input
          type="text"
          name="note"
          value={escapeHtml(defaultNote)}
          data-testid="withdraw-note"
        />
        <button type="submit" data-testid="withdraw-button">
          Withdraw
        </button>
      </form>

      <form
        hx-delete={`/children/${encodeURIComponent(child.name)}`}
        data-testid="remove-child-form"
      >
        <button type="submit" data-testid="remove-child-button">
          Remove {safeName}
        </button>
      </form>

      <div id="transaction-list" data-testid="transaction-list">
        {transactions.map((tx) => (
          <TransactionItem tx={tx} />
        ))}
      </div>
    </Layout>
  )
}

export function BalanceDisplay({ balance }: { balance: number }) {
  const safeBalance = escapeHtml(formatPence(balance))
  const balanceClass = balance < 0 ? "negative" : ""
  return (
    <div id="balance-display" data-testid="balance-display" class={balanceClass}>
      {safeBalance}
    </div>
  )
}

export function TransactionItem({ tx }: { tx: TransactionRow }) {
  const safeNote = escapeHtml(tx.note)
  const safeAmount = escapeHtml(formatPence(tx.amount))
  const safeRecordedBy = escapeHtml(tx.recordedBy)
  const safeKind = escapeHtml(tx.kind)

  return (
    <div data-testid={`transaction-${tx.id}`}>
      <span data-testid={`tx-kind-${tx.id}`}>{safeKind}</span>
      <span data-testid={`tx-amount-${tx.id}`}>{safeAmount}</span>
      <span data-testid={`tx-note-${tx.id}`}>{safeNote}</span>
      <span data-testid={`tx-recorded-by-${tx.id}`}>{safeRecordedBy}</span>
      <span data-testid={`tx-recorded-at-${tx.id}`}>{escapeHtml(tx.recordedAt)}</span>
    </div>
  )
}

export function TransactionError({ formId, message }: { formId: string; message: string }) {
  const safeMessage = escapeHtml(message)
  return (
    <div id={formId} hx-swap-oob="true" data-testid={formId}>
      <p data-testid={`${formId}-message`}>{safeMessage}</p>
    </div>
  )
}
