import { escapeHtml } from "@kitajs/html";
import { Layout } from "../shared/layout";
import { formatPence } from "../shared/currency";
import { computeAge } from "../shared/age";
import type { ChildWithBalance } from "./commands";

/**
 * Children views — Midnight Strip redesign.
 *
 * Component shapes, prop interfaces, and every data-testid are preserved
 * from the previous design; only markup + classes have changed. Handlers
 * in src/children/handlers.tsx don't need to change.
 *
 * Cycle of edge-glow colors for the kid cards: primary → cool → accent.
 * This is the same rotation the prototype used.
 */

const CARD_EDGE_CYCLE = ["", "glow-edge-cool", "glow-edge-accent"] as const;

interface HomePageProps {
  sessionName: string;
  children: ChildWithBalance[];
  defaultNote: string;
}

export function HomePage({ sessionName, children }: HomePageProps) {
  const totalPence = children.reduce((sum, c) => sum + c.balance, 0);
  return (
    <Layout sessionName={sessionName}>
      <VaultHero
        kidCount={children.length}
        totalPence={totalPence}
        operatorName={sessionName}
      />
      <ChildrenList children={children} />
    </Layout>
  );
}

interface VaultHeroProps {
  kidCount: number;
  totalPence: number;
  operatorName: string;
}

function VaultHero({ kidCount, totalPence, operatorName }: VaultHeroProps) {
  const safeTotal = escapeHtml(formatPence(totalPence));
  const safeOperator = escapeHtml(operatorName);
  return (
    <section class="text-center mb-8" data-testid="vault-hero">
      <p class="font-mono text-[10px] tracking-[0.24em] uppercase text-dim">
        Vault Total
      </p>
      <p
        data-testid="vault-total"
        class="font-display text-[3.5rem] leading-none mt-2 text-cool glow-cool tabular-nums tracking-wider strip-pulse"
      >
        {safeTotal}
      </p>
      <p class="text-sm text-dim mt-3 leading-tight">
        {kidCount === 0 ? (
          "no kids yet · add your first below"
        ) : (
          <>
            across{" "}
            <span class="text-primary font-bold">
              {String(kidCount) as "safe"}
            </span>{" "}
            {kidCount === 1 ? "kid" : "kids"} · welcome back,{" "}
            {safeOperator as "safe"}
          </>
        )}
      </p>
    </section>
  );
}

interface AddChildPageProps {
  sessionName: string;
  error?: string;
  value?: string;
  dobValue?: string;
}

export function AddChildPage({
  sessionName,
  error,
  value,
  dobValue,
}: AddChildPageProps) {
  const safeError = error ? escapeHtml(error) : undefined;
  const safeValue = value ? escapeHtml(value) : "";
  const safeDobValue = dobValue ? escapeHtml(dobValue) : "";

  return (
    <Layout title="Add child" sessionName={sessionName}>
      <div class="mb-6">
        <a
          href="/"
          class="font-ui text-xs font-semibold tracking-[0.12em] uppercase text-cool no-underline"
        >
          ← back
        </a>
      </div>

      <h1 class="font-display text-[2.5rem] leading-none tracking-[0.12em] text-accent glow-accent flicker mb-4">
        New Kid
      </h1>
      <p class="text-sm text-dim mb-7 leading-relaxed">
        Add a child to your family vault. They'll start with a balance of £0.00.
      </p>

      <div class="strip-card glow-edge-accent mb-6">
        <form
          method="post"
          action="/children"
          data-testid="add-child-form"
          class="flex flex-col gap-3"
        >
          <label class="block">
            <span class="neon-input-label is-accent">child's name</span>
            <input
              type="text"
              name="name"
              placeholder="e.g. Elizabeth"
              required
              value={safeValue}
              data-testid="add-child-input"
              class="neon-input is-accent is-display"
            />
          </label>
          <label class="block">
            <span class="neon-input-label is-accent">date of birth</span>
            <input
              type="date"
              name="dob"
              required
              value={safeDobValue}
              data-testid="add-child-dob"
              class="neon-input is-accent"
            />
          </label>
          {safeError && (
            <p
              data-testid="add-child-error"
              class="font-mono text-[10px] tracking-wide text-danger pl-1"
            >
              ↳ {safeError}
            </p>
          )}
          <div class="flex flex-col gap-2 mt-2">
            <button
              type="submit"
              data-testid="add-child-button"
              class="neon-pill is-accent is-full"
            >
              Add Kid ↗
            </button>
            <a
              href="/"
              data-testid="add-child-cancel"
              class="text-center py-3 font-ui text-xs font-semibold tracking-[0.16em] uppercase text-dim no-underline"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </Layout>
  );
}

interface ChildrenListProps {
  children: ChildWithBalance[];
}

export function ChildrenList({ children }: ChildrenListProps) {
  if (children.length === 0) {
    return <EmptyState />;
  }
  return (
    <>
      <div class="mb-3 px-1" data-testid="children-list-header">
        <span class="font-alt text-sm tracking-[0.32em] lowercase text-primary glow-primary flicker">
          ↡ kids
        </span>
      </div>
      <div class="flex flex-col gap-4" data-testid="children-list">
        {children.map((child, idx) => (
          <ChildCard child={child} index={idx} />
        ))}
      </div>
    </>
  );
}

export function EmptyState() {
  return (
    <div
      data-testid="empty-state"
      class="text-center px-6 py-9 rounded-[18px] mt-2"
      style="border: 1.5px dashed rgb(255 46 147 / 0.5); background: linear-gradient(135deg, rgb(255 46 147 / 0.07), transparent 70%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 0 20px rgb(255 46 147 / 0.25);"
    >
      <p class="font-display text-[1.75rem] leading-none tracking-[0.12em] text-primary glow-primary flicker mb-3">
        Empty vault
      </p>
      <p class="text-sm text-dim mb-6 leading-relaxed max-w-[16rem] mx-auto">
        Add a child to start tracking their pocket money. Each kid gets their
        own balance and ledger.
      </p>
      <a href="/add-child" data-testid="empty-state-add" class="neon-pill">
        + Add the first kid
      </a>
    </div>
  );
}

interface ChildCardProps {
  child: ChildWithBalance;
  index?: number;
}

/**
 * ChildCard — a kid's row on the home list. The leading character of the
 * name renders as a glowing monogram orb (avatar-free, no images to manage).
 * Edge glow rotates through the CARD_EDGE_CYCLE so a 3-kid family reads as
 * three distinct lights — pink, cyan, violet.
 *
 * Negative balances are styled in the danger color via the .glow-danger class
 * and a `text-danger` utility — matches the old red treatment but in palette.
 */
export function ChildCard({ child, index = 0 }: ChildCardProps) {
  const safeName = escapeHtml(child.name);
  const safeBalance = escapeHtml(formatPence(child.balance));
  const age = computeAge(child.dob);
  const negative = child.balance < 0;
  const edge = CARD_EDGE_CYCLE[index % CARD_EDGE_CYCLE.length];
  // Map the rotation to the matching balance text class/glow.
  const balanceTone = negative
    ? "text-danger glow-danger"
    : edge === "glow-edge-cool"
      ? "text-cool glow-cool"
      : edge === "glow-edge-accent"
        ? "text-accent glow-accent"
        : "text-primary glow-primary";
  const orbColor =
    edge === "glow-edge-cool"
      ? "var(--color-cool)"
      : edge === "glow-edge-accent"
        ? "var(--color-accent)"
        : "var(--color-primary)";

  return (
    <a
      href={`/children/${encodeURIComponent(child.name)}`}
      data-testid={`child-card-${safeName}`}
      class={`strip-card ${edge} flex items-center gap-4 no-underline`}
    >
      <div
        aria-hidden="true"
        class="w-[52px] h-[52px] rounded-full shrink-0 flex items-center justify-center font-display text-[1.375rem] text-ink"
        style={`background: radial-gradient(circle at 35% 30%, ${orbColor}, color-mix(in srgb, ${orbColor} 33%, transparent) 60%, transparent 75%); box-shadow: 0 0 18px ${orbColor}, inset 0 0 12px color-mix(in srgb, ${orbColor} 67%, transparent);`}
      >
        {escapeHtml(child.name.charAt(0))}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-ui text-[1.1875rem] font-semibold text-ink tracking-tight leading-tight truncate">
          <span data-testid={`child-name-${safeName}`}>{safeName}</span>{" "}
          <span
            data-testid={`child-age-${safeName}`}
            class="font-normal text-dim"
          >
            ({String(age) as "safe"})
          </span>
        </p>
        <p class="font-mono text-[10px] tracking-[0.16em] uppercase text-dim mt-1">
          tap to manage →
        </p>
      </div>
      <div
        data-testid={`child-balance-${safeName}`}
        class={`font-display text-[1.875rem] leading-none tabular-nums tracking-wide text-right ${balanceTone}`}
      >
        {safeBalance}
      </div>
    </a>
  );
}

interface ConfirmRemovePageProps {
  sessionName: string;
  child: ChildWithBalance;
  transactionCount: number;
}

export function ConfirmRemovePage({
  sessionName,
  child,
  transactionCount,
}: ConfirmRemovePageProps) {
  const safeName = escapeHtml(child.name);
  const safeBalance = escapeHtml(formatPence(child.balance));
  const safeCount = String(transactionCount);
  const encodedName = encodeURIComponent(child.name);
  const transactionsWord =
    transactionCount === 1 ? "transaction" : "transactions";

  return (
    <Layout title={`Remove ${child.name}`} sessionName={sessionName}>
      <div class="mb-6">
        <a
          href={`/children/${encodedName}`}
          class="font-ui text-cool text-xs font-semibold tracking-[0.12em] uppercase no-underline"
        >
          ← back
        </a>
      </div>

      <h1 class="font-display text-accent glow-accent flicker mb-1 text-[2rem] leading-none tracking-[0.12em]">
        Remove
      </h1>
      <h1
        class="font-display text-danger glow-danger mb-6 text-[2.5rem] leading-none tracking-[0.12em]"
        data-testid="confirm-remove-child-name"
      >
        {safeName}
      </h1>

      <div
        data-testid="confirm-remove-summary"
        class="strip-card glow-edge-danger mb-4"
      >
        <p class="font-mono text-dim mb-4 text-[10px] tracking-[0.16em] uppercase">
          About to delete
        </p>
        <div class="flex flex-col gap-3.5">
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-mono text-dim text-[11px] tracking-[0.12em] uppercase">
              Balance
            </span>
            <strong
              data-testid="confirm-remove-balance"
              class="font-display text-cool glow-cool text-right text-[1.875rem] leading-none tracking-[0.06em] tabular-nums"
            >
              {safeBalance}
            </strong>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-mono text-dim text-[11px] tracking-[0.12em] uppercase">
              Transactions
            </span>
            <strong
              data-testid="confirm-remove-transaction-count"
              class="font-display text-primary glow-primary text-right text-[1.875rem] leading-none tracking-[0.06em] tabular-nums"
            >
              {safeCount}
            </strong>
          </div>
        </div>
      </div>

      <div class="strip-warn mb-6" data-testid="confirm-remove-warning">
        <strong class="text-warn block text-[11px] font-bold tracking-[0.12em] uppercase">
          Heads up
        </strong>
        This permanently deletes {safeName} and all {safeCount}{" "}
        {transactionsWord}. It cannot be undone.
      </div>

      <form
        method="post"
        action={`/children/${encodedName}/remove`}
        data-testid="confirm-remove-form"
        class="m-0 flex flex-col gap-3"
      >
        <button
          type="submit"
          data-testid="confirm-remove-button"
          class="neon-pill is-danger is-full"
        >
          Remove {safeName} forever
        </button>
        <a
          href={`/children/${encodedName}`}
          data-testid="confirm-remove-cancel"
          class="font-ui text-dim text-center text-xs font-semibold tracking-[0.16em] uppercase no-underline py-3"
        >
          Cancel
        </a>
      </form>
    </Layout>
  );
}
