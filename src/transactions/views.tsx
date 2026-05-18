import { escapeHtml } from "@kitajs/html";
import { Layout } from "../shared/layout";
import { formatPence } from "../shared/currency";
import { formatTransactionTime } from "../shared/datetime";
import type { ChildWithBalance } from "../children/commands";
import type { TransactionRow } from "./commands";

/**
 * Transaction views — Midnight Strip redesign.
 *
 * Critical contracts preserved from the previous design (handlers.tsx
 * relies on these and Playwright tests target them):
 *
 *   • <BalanceDisplay balance={n} oob={bool}/>
 *       — id="balance-display", data-testid="balance-display"
 *       — when oob=true, sets hx-swap-oob="true" so the handler can OOB-swap
 *         a fresh balance after a transaction posts.
 *
 *   • <TransactionItem tx={...}/>
 *       — must render as a standalone bordered card; the deposit/withdraw
 *         POST returns it bare (no parent), and htmx prepends it into
 *         #transaction-list via hx-swap="afterbegin".
 *
 *   • <TransactionError formId="deposit-errors"/withdraw-errors"/>
 *       — id={formId}, data-testid={formId}, hx-swap-oob="true" — replaces
 *         the matching error <div> in the form when validation fails.
 *
 *   • The deposit/withdraw form ids, inputs (name=amount, name=note),
 *     hx-post URLs, hx-target="#transaction-list", and hx-swap="afterbegin"
 *     are unchanged.
 */

interface ChildDetailPageProps {
  sessionName: string;
  child: ChildWithBalance;
  transactions: TransactionRow[];
  defaultNote: string;
}

export function ChildDetailPage({
  sessionName,
  child,
  transactions,
  defaultNote,
}: ChildDetailPageProps) {
  const safeName = escapeHtml(child.name);

  return (
    <Layout title={child.name} sessionName={sessionName}>
      <div class="mb-6">
        <a
          href="/"
          class="font-ui text-xs font-semibold tracking-[0.12em] uppercase text-cool no-underline"
        >
          ← back
        </a>
      </div>

      <div class="text-center mb-7">
        <h1
          class="font-display text-[2.375rem] leading-none tracking-[0.12em] text-accent glow-accent flicker"
          data-testid="child-name-display"
        >
          {safeName}
        </h1>
        <p class="font-mono text-[10px] tracking-[0.24em] uppercase text-dim mt-4">
          available balance
        </p>
        <BalanceDisplay balance={child.balance} />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        {/* DEPOSIT */}
        <div class="strip-card glow-edge-cool">
          <h2 class="font-ui text-[13px] font-bold tracking-[0.16em] uppercase text-cool mb-4">
            ↑ Deposit
          </h2>
          <div id="deposit-errors" data-testid="deposit-errors"></div>
          <form
            hx-post={`/children/${encodeURIComponent(child.name)}/deposit`}
            hx-target="#transaction-list"
            hx-swap="afterbegin"
            data-testid="deposit-form"
            class="flex flex-col gap-3"
          >
            <label class="block">
              <span class="neon-input-label">amount</span>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                value="2.00"
                required
                data-testid="deposit-amount"
                class="neon-input is-display"
              />
            </label>
            <label class="block">
              <span class="neon-input-label">note</span>
              <input
                type="text"
                name="note"
                value={escapeHtml(defaultNote)}
                placeholder="e.g. weekly pocket money"
                data-testid="deposit-note"
                class="neon-input"
              />
            </label>
            <button
              type="submit"
              data-testid="deposit-button"
              class="neon-pill is-cool is-full mt-1"
            >
              Deposit
            </button>
          </form>
        </div>

        {/* WITHDRAW */}
        <div class="strip-card">
          <h2 class="font-ui text-[13px] font-bold tracking-[0.16em] uppercase text-primary mb-4">
            ↓ Withdraw
          </h2>
          <div id="withdraw-errors" data-testid="withdraw-errors"></div>
          <form
            hx-post={`/children/${encodeURIComponent(child.name)}/withdraw`}
            hx-target="#transaction-list"
            hx-swap="afterbegin"
            data-testid="withdraw-form"
            class="flex flex-col gap-3"
          >
            <label class="block">
              <span class="neon-input-label is-primary">amount</span>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                placeholder="£0.00"
                required
                data-testid="withdraw-amount"
                class="neon-input is-primary is-display"
              />
            </label>
            <label class="block">
              <span class="neon-input-label is-primary">note</span>
              <input
                type="text"
                name="note"
                placeholder="e.g. ice cream"
                data-testid="withdraw-note"
                class="neon-input is-primary"
              />
            </label>
            <button
              type="submit"
              data-testid="withdraw-button"
              class="neon-pill is-full mt-1"
            >
              Withdraw
            </button>
          </form>
        </div>
      </div>

      <div class="mb-7">
        <h2 class="font-alt text-sm tracking-[0.32em] lowercase text-accent glow-accent flicker mb-4 px-1">
          ↡ transactions
        </h2>
        <div
          id="transaction-list"
          data-testid="transaction-list"
          class="flex flex-col gap-2.5"
        >
          {transactions.length === 0 && (
            <div
              data-testid="tx-empty-state"
              class="text-center py-6 px-4 rounded-[14px] border border-dashed border-white/10 font-mono text-[11px] tracking-wide text-very-dim"
            >
              no transactions yet
            </div>
          )}
          {transactions.map((tx) => (
            <TransactionItem tx={tx} />
          ))}
        </div>
      </div>

      <a
        href={`/children/${encodeURIComponent(child.name)}/remove`}
        data-testid="remove-child-button"
        class="neon-pill is-danger is-full no-underline"
      >
        Remove {safeName}
      </a>
    </Layout>
  );
}

/**
 * BalanceDisplay — also OOB-swapped after every deposit/withdraw so the
 * header updates without a full re-render. The .strip-pulse class gives
 * the number a gentle brightness oscillation for the "live" feel.
 */
export function BalanceDisplay({
  balance,
  oob,
}: {
  balance: number;
  oob?: boolean;
}) {
  const safeBalance = escapeHtml(formatPence(balance));
  const negative = balance < 0;
  const tone = negative
    ? "text-danger glow-danger"
    : "text-primary glow-primary";
  return (
    <div
      id="balance-display"
      data-testid="balance-display"
      class={`font-display text-[4.5rem] leading-none mt-2 tabular-nums tracking-wider strip-pulse ${tone}`}
      hx-swap-oob={oob ? "true" : undefined}
    >
      {safeBalance}
    </div>
  );
}

/**
 * TransactionItem — single row in the ledger. Rendered standalone when
 * appended via htmx (deposit/withdraw response), or in a loop on initial
 * page load. Glass card with edge-glow keyed to deposit (cool) vs
 * withdrawal (primary).
 */
export function TransactionItem({ tx }: { tx: TransactionRow }) {
  const safeNote = escapeHtml(tx.note);
  const safeAmount = escapeHtml(formatPence(tx.amount));
  const safeRecordedBy = escapeHtml(tx.recordedBy);
  const safeKind = escapeHtml(tx.kind);
  const isDeposit = tx.kind === "deposit";
  const edge = isDeposit ? "glow-edge-cool" : "";
  const tone = isDeposit ? "text-cool glow-cool" : "text-primary glow-primary";
  const badgeTone = isDeposit
    ? "text-cool border-cool"
    : "text-primary border-primary";
  const amountPrefix = isDeposit ? "+" : "−";

  return (
    <div
      data-testid={`transaction-${tx.id}`}
      class={`strip-card ${edge}`}
      style="padding: 0.75rem 0.875rem; border-radius: 0.875rem;"
    >
      <div class="flex items-center justify-between mb-1.5">
        <span
          data-testid={`tx-kind-${tx.id}`}
          class={`font-mono text-[9px] tracking-[0.16em] uppercase px-2 py-0.5 rounded-full border ${badgeTone}`}
        >
          {safeKind}
        </span>
        <span
          data-testid={`tx-amount-${tx.id}`}
          class={`font-display text-[1.625rem] leading-none tabular-nums ${tone}`}
        >
          {amountPrefix}
          {safeAmount}
        </span>
      </div>
      <p
        data-testid={`tx-note-${tx.id}`}
        class="font-ui text-[13px] text-ink mb-1"
      >
        {safeNote}
      </p>
      <div class="flex items-center justify-between font-mono text-[9px] tracking-wide text-dim">
        <span data-testid={`tx-recorded-by-${tx.id}`}>{safeRecordedBy}</span>
        <span data-testid={`tx-recorded-at-${tx.id}`}>
          {escapeHtml(formatTransactionTime(tx.recordedAt))}
        </span>
      </div>
    </div>
  );
}

/**
 * TransactionError — OOB-swapped into the deposit/withdraw form's error
 * <div> when the handler returns a Result.err. Keep the wrapper id matching
 * `formId` so htmx can find its target.
 */
export function TransactionError({
  formId,
  message,
}: {
  formId: string;
  message: string;
}) {
  const safeMessage = escapeHtml(message);
  return (
    <div id={formId} hx-swap-oob="true" data-testid={formId}>
      <p
        data-testid={`${formId}-message`}
        class="font-mono text-[10px] tracking-wide text-danger pl-1 mb-2"
      >
        ↳ {safeMessage}
      </p>
    </div>
  );
}
