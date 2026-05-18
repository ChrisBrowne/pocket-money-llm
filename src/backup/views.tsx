import { escapeHtml } from "@kitajs/html";
import { Layout } from "../shared/layout";
import type { BackupData } from "./schema";

/**
 * Backup views — Midnight Strip redesign.
 *
 * Functional contracts preserved:
 *   • <a href="/backup/export"> for the export download (plain GET)
 *   • Restore form: POST multipart/form-data to /backup/restore/upload,
 *     <input type="file" name="file" accept=".json" required>
 *   • Restore confirm: POST to /backup/restore/confirm with a hidden
 *     <textarea name="data"> carrying the encoded payload (textarea
 *     not <input> to preserve whitespace in the JSON).
 *   • Every data-testid kept verbatim.
 *
 * Visual mapping:
 *   • Export → strip-card with cool (cyan) edge glow + Export pill
 *   • Restore → strip-card with primary (pink) edge glow + file input + Restore pill
 *   • Confirm summary → strip-card with accent (violet) edge glow + amber
 *     strip-warn callout + red Confirm + ghost Cancel
 *   • RestoreError → strip-error block with back link
 */

interface BackupPageProps {
  sessionName: string;
  uploadError?: string;
}

export function BackupPage({ sessionName, uploadError }: BackupPageProps) {
  const safeUploadError = uploadError ? escapeHtml(uploadError) : undefined;

  return (
    <Layout title="Backup and restore" sessionName={sessionName}>
      <h1 class="font-display text-[2.25rem] leading-none tracking-[0.12em] text-accent glow-accent flicker mb-1">
        Backup
      </h1>
      <h1
        class="font-display text-[2.25rem] leading-none tracking-[0.12em] text-accent glow-accent mb-6"
        style="opacity: 0.85;"
      >
        & Restore
      </h1>

      <section
        data-testid="backup-export-section"
        class="strip-card glow-edge-cool mb-4"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1">
            <h2 class="font-ui text-[14px] font-bold tracking-[0.16em] uppercase text-cool mb-1">
              ↗ Export
            </h2>
            <p class="text-[12px] text-dim leading-relaxed max-w-[15rem]">
              Download a JSON file containing all children and transactions.
            </p>
          </div>
          <span
            aria-hidden="true"
            class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-bg"
            style="background: radial-gradient(circle at 35% 30%, var(--color-cool), color-mix(in srgb, var(--color-cool) 33%, transparent) 60%, transparent 80%); box-shadow: 0 0 14px var(--color-cool);"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 2v9M4 7l4 4 4-4M2 14h12" />
            </svg>
          </span>
        </div>
        <a
          href="/backup/export"
          data-testid="export-backup"
          class="neon-pill is-cool is-full"
        >
          ↓ Export Backup
        </a>
      </section>

      <section data-testid="backup-restore-section" class="strip-card">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1">
            <h2 class="font-ui text-[14px] font-bold tracking-[0.16em] uppercase text-primary mb-1">
              ↙ Restore
            </h2>
            <p class="text-[12px] text-dim leading-relaxed max-w-[15rem]">
              Upload a previously exported JSON file. This will replace all
              existing data.
            </p>
          </div>
          <span
            aria-hidden="true"
            class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-bg"
            style="background: radial-gradient(circle at 35% 30%, var(--color-primary), color-mix(in srgb, var(--color-primary) 33%, transparent) 60%, transparent 80%); box-shadow: 0 0 14px var(--color-primary);"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 14V5M4 9l4-4 4 4M2 2h12" />
            </svg>
          </span>
        </div>

        <form
          method="post"
          action="/backup/restore/upload"
          enctype="multipart/form-data"
          data-testid="restore-upload-form"
          class="flex flex-col gap-3"
        >
          <input
            type="file"
            name="file"
            accept=".json"
            required
            data-testid="restore-file-input"
            class="neon-file-input"
          />
          <button
            type="submit"
            data-testid="restore-upload-button"
            class="neon-pill is-full"
          >
            ↑ Restore from Backup
          </button>
        </form>
        {safeUploadError && (
          <p
            data-testid="restore-upload-error"
            class="font-mono text-[10px] tracking-wide text-danger mt-3 pl-1"
          >
            ↳ {safeUploadError}
          </p>
        )}
      </section>

      <div
        class="mt-6 px-4 py-3.5 rounded-xl border border-white/8 bg-black/35 font-mono text-[10px] tracking-wide text-dim leading-relaxed"
        data-testid="backup-note"
      >
        <span class="text-cool tracking-[0.16em] uppercase font-bold text-[9px]">
          Note
        </span>
        <br />
        Backups are not encrypted. Keep them somewhere safe.
      </div>
    </Layout>
  );
}

interface RestoreSummaryPageProps {
  sessionName: string;
  data: BackupData;
  encodedData: string;
}

export function RestoreSummaryPage({
  sessionName,
  data,
  encodedData,
}: RestoreSummaryPageProps) {
  const safeChildCount = String(data.children.length);
  const safeTransactionCount = String(data.transactions.length);
  const safeExportedAt = escapeHtml(data.exported_at);

  return (
    <Layout title="Confirm Restore" sessionName={sessionName}>
      <div class="mb-6">
        <a
          href="/"
          class="font-ui text-xs font-semibold tracking-[0.12em] uppercase text-cool no-underline"
        >
          ← back
        </a>
      </div>

      <h1 class="font-display text-[2rem] leading-none tracking-[0.12em] text-accent glow-accent flicker mb-1">
        Confirm
      </h1>
      <h1 class="font-display text-[2rem] leading-none tracking-[0.12em] text-primary glow-primary mb-6">
        Restore
      </h1>

      <div
        data-testid="restore-summary"
        class="strip-card glow-edge-accent mb-4"
      >
        <p class="font-mono text-[10px] tracking-[0.16em] uppercase text-dim mb-4">
          File contents
        </p>
        <div class="flex flex-col gap-3.5">
          <SummaryRow
            label="Kids"
            value={safeChildCount}
            tone="cool"
            testId="restore-child-count"
          />
          <SummaryRow
            label="Transactions"
            value={safeTransactionCount}
            tone="primary"
            testId="restore-transaction-count"
          />
          <SummaryRow
            label="Exported"
            value={safeExportedAt}
            tone="accent"
            small
            testId="restore-exported-at"
          />
        </div>
      </div>

      <div class="strip-warn mb-6">
        <strong class="block font-bold tracking-[0.12em] uppercase text-warn text-[11px]">
          Heads up
        </strong>
        This will replace all existing data. Your current vault cannot be
        recovered.
      </div>

      <form
        method="post"
        action="/backup/restore/confirm"
        class="flex flex-col gap-3 m-0"
      >
        <textarea name="data" style="display:none" data-testid="restore-data">
          {encodedData as "safe"}
        </textarea>
        <button
          type="submit"
          data-testid="restore-confirm-button"
          class="neon-pill is-danger is-full"
        >
          ↻ Confirm Restore
        </button>
        <a
          href="/"
          data-testid="restore-cancel"
          class="text-center py-3 font-ui text-xs font-semibold tracking-[0.16em] uppercase text-dim no-underline"
        >
          Cancel
        </a>
      </form>
    </Layout>
  );
}

/**
 * One labelled stat row inside the restore-summary card. The value gets
 * a display-font + glow treatment so it reads as a callout, not a string.
 */
function SummaryRow({
  label,
  value,
  tone,
  small,
  testId,
}: {
  label: string;
  value: string;
  tone: "cool" | "primary" | "accent";
  small?: boolean;
  testId: string;
}) {
  const toneClass =
    tone === "cool"
      ? "text-cool glow-cool"
      : tone === "primary"
        ? "text-primary glow-primary"
        : "text-accent glow-accent";
  return (
    <div class="flex items-baseline justify-between gap-3">
      <span class="font-mono text-[11px] tracking-[0.12em] uppercase text-dim">
        {label as "safe"}
      </span>
      <strong
        data-testid={testId}
        class={`font-display ${small ? "text-[1rem]" : "text-[1.875rem]"} leading-none tabular-nums tracking-[0.06em] text-right ${toneClass}`}
      >
        {value as "safe"}
      </strong>
    </div>
  );
}

export function RestoreError({ message }: { message: string }) {
  const safeMessage = escapeHtml(message);
  return (
    <div data-testid="restore-error" class="strip-error">
      <p class="font-ui text-sm text-ink mb-3 leading-relaxed">{safeMessage}</p>
      <a
        href="/"
        class="font-ui text-xs font-semibold tracking-[0.12em] uppercase text-danger glow-danger no-underline"
      >
        ← back to home
      </a>
    </div>
  );
}
