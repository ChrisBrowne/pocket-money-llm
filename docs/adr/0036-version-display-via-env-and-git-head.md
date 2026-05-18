# ADR-0036: Version display via VERSION env var → .git/HEAD fallback

## Status

Accepted

## Context

When debugging "is this fix actually deployed?" or "which commit am I looking at?", there was no signal from the running app. The deploy mechanism (`git pull && systemctl restart`) leaves no trace in the running process about what commit is checked out. SSHing in and running `git rev-parse HEAD` works but is friction in a moment when friction is unwelcome.

A version indicator in the UI itself is the cleanest answer. Even a 7-character SHA in the footer answers "what's running?" at a glance from any device on the tailnet.

There are several possible sources for the version string. The design constraint is that the chosen mechanism shouldn't paint into a corner — specifically, it should keep working if the deploy model later evolves from "git pull" to "CI artifact" (a possibility flagged but deferred). Sources considered:

1. **Read `.git/HEAD` at startup.** Works for the current deploy (the LXC has `.git/` from the original clone). Breaks if `.git/` is stripped from an artifact.
2. **Generate a `version.ts` (or `version.json`) at `make build` time.** Robust to deploy model. Requires the build step to run, which becomes an implicit dependency for `bun src/index.tsx` and local dev workflows.
3. **Environment variable.** Works in any deploy model — current `EnvironmentFile` in the systemd unit, future CI artifact with a `VERSION` injection. Has no fallback when not set.
4. **Shell out to `git rev-parse HEAD`.** Robust but slow-ish, requires `git` installed, and an external process dependency at startup is heavier than a file read.

None of these alone is ideal. A fallback chain composes them:

1. `process.env.VERSION` if set (covers future CI artifact, ad-hoc operator override)
2. `.git/HEAD` read directly (covers the current git-pull deploy)
3. `"unknown"` (covers the case where neither is available — should be visible rather than crashing)

Reading `.git/HEAD` directly is more involved than it first looks: the file is either a SHA (detached HEAD) or a symbolic ref (`ref: refs/heads/main`), and the ref's SHA may be in `.git/refs/heads/main` _or_ in `.git/packed-refs` after a `git gc`. All three cases need handling.

The displayed value is the **7-character short SHA**, matching standard git output conventions. Long enough to be uniquely identifying in practice for this repo's size, short enough to display compactly in a footer.

## Decision

A `src/version.ts` module reads the version at startup with the fallback chain above and exports `VERSION` as a module-level constant. `src/shared/layout.tsx` imports it and renders it in a footer, with the SHA hyperlinked to the GitHub commit when it's a real SHA. When the value is `"unknown"`, it renders as plain text without a link.

The version is read **once** at process start, not per request. Modifying the running app's commit doesn't change the displayed version until restart — which is correct semantics, since "what's running" is the question being answered.

A `VERSION` env var is added to `.env.example` (commented, optional) for documentation. The current deploy doesn't set it; it's reserved for the future CI-artifact case.

## Consequences

- Every page renders the current version in the footer. Operators can answer "what's deployed?" from any tailnet device without SSHing.
- The SHA is hyperlinked to the GitHub commit when it's a real SHA. Click → see what changed.
- The fallback chain works in three deploy shapes: current `git pull` (reads `.git/HEAD`), future CI artifact (reads `VERSION` env), local dev with no `.git/` (shows `"unknown"`). No code change needed when switching deploy mechanisms.
- `src/version.ts` joins `db.ts`, `config.ts`, and `logger.ts` as a module-level singleton — matches the existing convention from CLAUDE.md.
- A small integration test asserts `VERSION` loads to a sensible value (non-empty, matches one of the expected shapes). Regression coverage if the fallback logic ever drifts.
- A future build step (Phase 3 of the version+CI track, if ever pursued) doesn't require touching `version.ts` — it just sets the env var. The decision is forward-compatible.
- The footer is plain styling (centred, gray, small). No interaction beyond the optional GitHub link. Not part of the domain — not covered by the Allium spec.
