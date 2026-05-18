# ADR-0035: CI runs lint and tests on push and PR

## Status

Accepted

## Context

The project has had no continuous integration. `make lint` and `make test` exist as Makefile targets but only ran when someone remembered to invoke them locally. The cost of this surfaced concretely in a single session:

- Eight TypeScript errors in the route handler modules had been latent since the handlers were first written. They only surfaced when `make lint` was extended to include `prettier --check` and someone ran it.
- Five branded-type assertions in `tests/unit/types.test.ts` had the same shape — `bun test` runs them fine, `tsc --noEmit` does not.

Neither of these would have shipped if the lint and test commands were run on every push. They are now caught, but only because of an unrelated workstream that prompted the lint run. A repeat is the default state without CI.

GitHub Actions is the natural place for this work — the repo is on GitHub, no extra account or service is needed. Self-hosted CI would add infrastructure for a two-user app; it would be over-engineered.

A few specific design choices need recording so the workflow file's shape isn't mysterious:

- **What to run.** `make lint` (tsc + prettier --check) and `make test` (unit + integration) are the obvious set. Playwright e2e tests (`make test-e2e`) cover the HTMX wire, OAuth redirects, and form-submission paths that integration tests do not — worth including even though they're slower.
- **Bun version pinning.** Locally and on CI it's tempting to use "latest", but Bun is the runtime — version drift between CI and production is a real source of confusing "passes locally, fails in CI" bugs. The deployed LXC runs a specific version; CI should match.
- **Job topology.** `lint-and-test` (~30s) and `e2e` (~90s) can run in parallel as separate jobs. Failures are isolated and reported separately — useful for understanding what's actually broken.
- **Concurrency.** Pushing two commits in quick succession would otherwise queue two CI runs. The in-flight one is wasted work — cancel it.
- **Permissions.** CI only needs to read the repo. Setting `permissions: contents: read` at workflow level is least-privilege and follows GitHub's security guidance.

## Decision

A single workflow at `.github/workflows/ci.yml` triggered on push to `main` and on pull requests targeting `main`. Two jobs run in parallel:

1. **`lint-and-test`**: checkout, set up Bun (pinned), `bun install --frozen-lockfile`, `make build`, `make lint`, `make test`.
2. **`e2e`**: checkout, set up Bun (same pin), `bun install --frozen-lockfile`, `make build`, `bunx playwright install --with-deps chromium`, `make test-e2e`.

The workflow includes:

- `concurrency` block with `cancel-in-progress: true` to drop superseded runs on the same ref.
- `permissions: contents: read` at workflow level.
- `bun install --frozen-lockfile` so dependency drift fails CI rather than silently updating `bun.lock`.
- Bun version explicitly pinned (currently `1.3.14`, matching the LXC) — bumping is a deliberate two-place change (workflow + LXC), recorded in commit history.

The workflow does not enforce branch protection. Making the CI status check required for merge is a repo-admin action separate from the workflow file — done in GitHub Settings → Branches once the workflow has run green a couple of times.

## Consequences

- Lint and test results are visible on every push and PR. Bugs that pass `bun test` but fail `tsc` (or vice versa) cannot reach `main` unnoticed.
- Pull requests get a status check. Once branch protection is enabled (separate admin action), failing CI blocks merge.
- Bun upgrades are now a two-place change — the workflow's `bun-version` and the LXC's installed Bun. The deployment runbook notes this alignment.
- E2E coverage in CI catches HTMX-path regressions that integration tests miss. Playwright in GitHub Actions is well-supported; flakiness is the failure mode worth watching for, and the standard mitigation (cache browsers, retry once, fix timing-dependent tests) is well-known.
- The workflow file is a small versioned artifact like the systemd unit or the cron file (ADR-0033 Category C territory in spirit, though not co-located in `scripts/` because it lives under `.github/` by convention).
- A future need to publish a build artifact (e.g. Phase 3 of the "version display + CI" track) extends this workflow with a third job rather than restructuring it. The current shape doesn't paint into a corner.
- CI is GitHub-coupled. If the repo ever moves off GitHub, the workflow file would need rewriting for the new platform. The decision to use GH Actions is intentional — the alternative cost (self-hosted runners, GitLab/Forgejo setup, etc.) isn't justified for the scale.
