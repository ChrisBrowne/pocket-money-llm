# ADR-0038: Visual redesign — Midnight Strip neon theme

## Status

Proposed

## Context

The previous visual design was a clean, minimal Tailwind layout — white cards on a gray background, blue/green/orange action colors, system sans-serif. It was functional and unambiguous, but visually generic. The user is the sole operator (with kids occasionally glancing) and wanted a design that "stands out, that you wouldn't forget once you've seen it" — while keeping all existing behaviour and accessibility intact.

A short design-exploration phase produced three directions (CRT Arcade, Midnight Strip in three palette moods, light alternates). The user locked onto **Midnight Strip / Hot** — a synthwave-noir aesthetic: deep purple sky with a horizon-line sun, perspective grid floor, hot pink + ice cyan + electric violet neon, Monoton display headings, Outfit body type.

Two practical constraints framed the implementation:

1. Every component shape, prop interface, htmx wiring, OOB swap target, and `data-testid` must be preserved — no domain code, command handlers, or Playwright tests should need to change.
2. The stack is Tailwind v4 + kitajs/html TSX templates. Multi-stop neon shadows are too gnarly to express inline as arbitrary-value utilities, so a shared component layer is needed.

One interaction with an existing decision needed resolving: ADR-0037 ("Setup features behind a navigation menu") established that the Home content area shrinks to just the children list and the empty state points users at the menu. The redesigned empty state introduces a single inline "Add the first kid" CTA on Home. This is recorded as an amendment to ADR-0037 rather than a supersession: the carve-out is narrow (empty state only, disappears as soon as any child exists), the menu remains the steady-state path to AddChild, and the underlying principle — no setup affordances on the populated Home — is preserved.

## Decision

Adopt the Midnight Strip / Hot aesthetic as the canonical visual design. Implement it via:

- **Design tokens** in `src/styles/input.css` `@theme` block — palette (`--color-primary`, `--color-cool`, `--color-accent`, `--color-warn`, `--color-danger`, plus deep/soft/rise background stops) and the four web fonts (Monoton display, Major Mono Display alt, Outfit UI, JetBrains Mono mono). Tailwind v4 automatically derives utilities (`text-primary`, `font-display`, etc.) from theme variables.
- **Self-hosted fonts.** The four families are loaded via hand-written `@font-face` rules at the top of `input.css`, pointing at `/fonts/*.woff2`. The woff2 files come from the `@fontsource` (Monoton, Major Mono Display) and `@fontsource-variable` (Outfit, JetBrains Mono) npm packages and are copied into `public/fonts/` by a `make fonts` target that `make css` depends on. Variable-font packages cover all weights in a single file, so Outfit at weights 300–800 needs one woff2 not six. Only the `latin` and `latin-ext` Unicode subsets are emitted (the display fonts use `latin` alone since they only render strings under our control). No external runtime dependency on a font CDN.
- **Shared component classes** in `@layer components`:
  - `glow-*` (`primary`, `accent`, `cool`, `warn`, `danger`) — multi-stop text-shadow stacks
  - `strip-card` — glass card with backdrop-blur + gradient border ring via `::before` mask-composite trick; edge glow via `.glow-edge-*` modifiers
  - `neon-pill` — primary action button with `--pill-color-rgb` CSS variable
  - `neon-icon-btn`, `neon-input`, `neon-file-input`, `neon-input-label`
  - `strip-warn`, `strip-error` — callouts
  - `strip-backdrop` — fixed-position sun-grid scene mounted as the first child of `<body>`
  - `flicker`, `strip-pulse` — keyframe animations, gated behind `prefers-reduced-motion`
- **Restyled views** in `src/shared/layout.tsx`, `src/children/views.tsx`, `src/transactions/views.tsx`, `src/backup/views.tsx`, `src/auth/dev-login.tsx`. All component exports, props, htmx attributes, OOB ids, and `data-testid` attributes are unchanged.
- The font files add ~136 KB across six woff2 files in `public/fonts/`, but only ~50 KB load on a typical page view (Outfit-latin + JetBrains-Mono-latin + the relevant display font). `latin-ext` only loads when a name contains accented characters; the app stays usable offline once a parent has opened it once.

The redesign does not introduce any new client-side JavaScript — interactivity is unchanged (htmx + the existing inline onclick toggles for the menu drawer).

## Consequences

- **Tests stay green**: every Playwright selector is `data-testid`-based per CLAUDE.md, and every testid is preserved. The visual change is invisible to the assertion layer.
- **Handlers unchanged**: `src/*/commands.ts`, `src/*/handlers.tsx`, `src/index.tsx`, `src/auth/*` (except `dev-login.tsx`'s page markup) are not modified.
- **CSS bundle grows**: the design system adds roughly 4 KB minified (Tailwind tree-shakes the unused utilities). Self-hosted fonts add ~136 KB on disk across six woff2 files in `public/fonts/`; a typical page view fetches only the latin subsets (~50 KB) on first paint and caches them aggressively thereafter. Acceptable for a private family tool, and the LXC stays self-contained — no third-party runtime fetch.
- **Backdrop-filter required**: the glass cards rely on `backdrop-filter: blur(8px)`. Supported in all modern browsers (2026). Falls back gracefully on older engines — cards render solid-ish rather than blurred but remain legible.
- **`color-mix` and modern color syntax**: a handful of styles use `color-mix(in srgb, …)` and `rgb(r g b / α)` syntax. Both are supported across Chrome, Safari, Firefox; no graceful fallback is required for the user's audience.
- **Accessibility maintained**: every `prefers-reduced-motion: reduce` viewer gets the flicker, pulse, and grid-scroll animations disabled. Focus rings are explicit on inputs (neon glow). Color contrast on body text (`var(--color-ink)` on `var(--color-bg)`) meets WCAG AA.
- **`color-scheme: dark`** is declared on `html` so form controls (file picker chrome, scroll bars) match the dark palette without per-element override.
- **Mobile-first**: the design assumes a single column up to `sm:` (640px). The deposit/withdraw form-row at `sm:grid-cols-2` preserves the previous two-column layout on tablets and up.
- **Reversal cost is low**: the new design is purely presentational — reverting is `git revert` of this changeset. Domain and tests are unaffected, so a rollback can be done without touching behaviour code.

If the design ever needs to swing back to "minimal banking-app" later, the same component-class pattern can host a second theme cleanly — palette variables flip and the structural CSS stays.
