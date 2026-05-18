# ADR-0033: Provisioning split — runbook for host/interactive, Makefile for repo-installable

## Status

Accepted

## Context

ADR-0019 declared LXC provisioning "manual" with the assumption that a README would suffice. The first production install made it clear that "manual" was undifferentiated: some steps are genuinely runbook (Proxmox-host work, interactive Tailscale auth, Web UI clicks in Google Cloud Console), while others are perfectly scriptable — installing the systemd unit, dropping a sudoers file, copying a cron entry into `/etc/cron.d/`. Lumping them all together as "manual" meant copy-pasting blocks of `cp` and `chmod` commands from documentation onto the LXC, which is exactly the kind of friction the "Makefile as the developer interface" guideline in CLAUDE.md exists to eliminate.

A clean split also makes the README easier to maintain. Runbook content stays in prose, scripted content lives in versioned files that the Makefile drives. Each piece is in its natural medium.

## Decision

Provisioning is split into five categories, each with a fixed home:

| Category                                                                                                                                              | Shape            | Home   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| **A. Proxmox host** (LXC creation, network config, TUN exposure, share mounts, bind mounts in LXC conf)                                               | runbook          | README |
| **B. In-LXC, pre-clone bootstrap** (apt installs, Bun installer, Tailscale install + auth, `tailscale serve`, user + directory creation, `git clone`) | runbook          | README |
| **C. In-LXC, post-clone one-time install** (systemd unit, sudoers, cron)                                                                              | Makefile targets | repo   |
| **D. Web UI / interactive auth** (Tailnet admin HTTPS enable, Google Cloud Console OAuth client, `.env` secret values)                                | runbook          | README |
| **E. Regular ops** (deploy, future log/backup convenience targets)                                                                                    | Makefile targets | repo   |

### Category C convention

- Each one-time install artifact lives under `scripts/` in the repo (e.g. `scripts/pocket-money.service`, `scripts/deploy.sudoers`, `scripts/backup.cron`).
- Each gets a Makefile target named `install-<thing>` (e.g. `install-systemd-unit`, `install-sudoers`, `install-cron`).
- Each target uses `install -m <mode>` for atomic copy with correct permissions, then performs any reload/validation step the artifact requires (`systemctl daemon-reload`, `visudo -c`, `systemctl reload cron`).
- Each target hard-fails with a clear message if not run as root.
- A meta-target `make provision` runs all `install-*` targets in dependency-safe order. First-time setup after the bootstrap (Category B) is one command.

### What stays out

- **Category A** cannot be scripted from this repo without dragging Proxmox-host scripting into a single-LXC repo. Stays as runbook.
- **Category B** cannot be scripted _until_ the repo is cloned, by definition. Stays as runbook.
- **Category D** involves Web UIs and secrets. Stays as runbook.
- The pre-clone bootstrap of Bun, Tailscale, and apt packages is not in scope for `make provision` — `make` may not even exist on the LXC before this point.

## Consequences

- A fresh LXC is provisioned by: runbook steps A and B, then `cp .env.example .env` + fill, then `make provision`, then `systemctl start pocket-money`. The runbook-to-script handoff happens at a defined boundary (the repo being cloned and `.env` being populated).
- Adding a new in-LXC installable artifact follows a fixed pattern: drop a file in `scripts/`, add `install-<thing>` to the Makefile, add it as a dependency of `provision`. No decision-making per artifact.
- The systemd unit moves from the repo root to `scripts/pocket-money.service`. Category C's artifacts are co-located.
- `make provision` is idempotent — re-running it reinstalls files at their canonical paths and reloads systemd/cron. Safe to run after any change to a Category C artifact.
- This ADR refines but does not supersede ADR-0019. ADR-0019's core decisions (systemd, manual git-pull deploy, no Docker) stand. This ADR sharpens what "manual" means and moves the scriptable parts into the Makefile.
- The deployment runbook (`docs/deployment.md`, to follow) inherits this structure — it contains Categories A, B, D explicitly, and points at `make provision` for C.
