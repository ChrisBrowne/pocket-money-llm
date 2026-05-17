# ADR-0032: Generated artifacts built on deploy host, not committed

## Status

Accepted

## Context

The Tailwind CSS output (`public/styles.css`) is generated from `src/styles/input.css` by `make css`. It is currently gitignored. The first production deploy raised the question of where this generation should happen, because `make deploy` as it stood was only documentation — it did not actually run a build step. Three options were considered:

1. **Commit the built artifact** to the repo. Deploy is pure `git pull && systemctl restart`.
2. **Build on the deploy host** as part of `make deploy`.
3. **Build inside the systemd unit** via `ExecStartPre`.

Each carries different costs:

- (1) reintroduces problems we already avoid for `node_modules`: merge conflicts on generated output, commit-time discipline to remember a build before pushing, and two-sources-of-truth drift between `input.css` and `styles.css`. Generated artifacts in a source repo are a category error.
- (2) keeps the build step where build concerns belong — the deploy flow — and reuses the existing `make build` chain.
- (3) couples the systemd unit to build tooling. A unit's job is to run the process; pulling builds into `ExecStartPre` blurs that line and means a restart on a misconfigured box can fail for build reasons rather than service reasons.

A related concern: the deploy target needs a real implementation, not placeholder echo lines. It also needs a runtime user. Building and pulling code should happen as the `pocket-money` service user (ADR-0019), so the resulting files are owned correctly. Restarting the systemd unit requires root. The two operations need to be combined cleanly.

This decision generalises beyond CSS. Future generated artifacts — bundled JS, generated TypeScript types, anything produced by a build — will face the same question.

## Decision

### Generated artifacts are not committed

Anything produced by a build step is gitignored. The repo contains source only. This applies to `public/styles.css` today and to any future generated artifact by default.

### Generated artifacts are built on the deploy host

`make deploy` runs `make build` between `bun install` and the service restart. `make build` is the existing chain for build steps and already triggers `make css`. New build steps are added to that chain.

```make
deploy:
    git pull
    bun install
    $(MAKE) build
    sudo systemctl restart pocket-money
```

The target runs in the repo working directory on the deploy host (`/opt/pocket-money`). It is invoked manually after SSH, consistent with ADR-0019's manual deployment stance.

### `make deploy` is run by the `pocket-money` user

To preserve file ownership (`git pull` and `bun install` create files), `make deploy` is invoked as the `pocket-money` system user. The user is granted a narrow sudoers permission — `NOPASSWD: /bin/systemctl restart pocket-money` and nothing else — so the `sudo systemctl restart` line works without an interactive password and without granting broader root access.

Typical invocation after SSH'ing into the LXC:

```
sudo -u pocket-money make -C /opt/pocket-money deploy
```

### Systemd unit stays out of the build path

`pocket-money.service` does not run any build commands. It runs `bun src/index.tsx` and nothing else. A first-time deploy on a new host therefore requires `make build` to be run at least once before the service is started — captured in the LXC provisioning steps, not the systemd unit.

## Consequences

- No generated files in the repo. No "did you remember to rebuild before pushing?" discipline, no merge conflicts on output, no drift.
- The deploy flow is now a real command, not documentation. `make deploy` does the full sequence.
- A first-time LXC deploy must run `make build` before the service starts. The runbook for provisioning a new LXC must include this step explicitly.
- A sudoers drop-in is part of LXC provisioning: `pocket-money ALL=(root) NOPASSWD: /bin/systemctl restart pocket-money`. Narrow privilege — one user, one command.
- The systemd unit remains a pure service definition. Build concerns and service concerns stay separated.
- Future generated artifacts inherit this policy by default. New build steps go into `make build`, get gitignored, and the deploy target picks them up for free.
- This ADR refines but does not supersede ADR-0019. ADR-0019's core decisions (systemd for process management, manual git-pull deploy) stand. This ADR fills in the build step that ADR-0019 omitted.
