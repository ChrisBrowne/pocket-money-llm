import { escapeHtml } from "@kitajs/html";
import { Layout } from "./layout";

interface NotFoundPageProps {
  sessionName?: string;
  message?: string;
}

export function NotFoundPage({ sessionName, message }: NotFoundPageProps) {
  const safeMessage = escapeHtml(
    message ?? "We couldn't find what you were looking for.",
  );

  return (
    <Layout title="Not found" sessionName={sessionName}>
      <div class="py-6 text-center" data-testid="not-found-page">
        <p class="font-display text-danger glow-danger flicker text-[5rem] leading-none tracking-[0.08em] tabular-nums">
          404
        </p>
        <p class="font-alt text-cool glow-cool mt-5 text-[11px] tracking-[0.4em] uppercase">
          ↜ off the strip ↝
        </p>
      </div>

      <div class="strip-error mb-6" data-testid="not-found-message">
        <p class="font-ui text-ink text-sm leading-relaxed">{safeMessage}</p>
      </div>

      <a
        href="/"
        data-testid="not-found-home"
        class="neon-pill is-cool is-full no-underline"
      >
        ↩ Back to home
      </a>
    </Layout>
  );
}
