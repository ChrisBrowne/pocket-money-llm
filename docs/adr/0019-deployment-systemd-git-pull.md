# ADR-0019: Deployment via systemd and git pull

**Status**: Accepted

**Context**: The app runs on a Proxmox LXC (ADR-0009). It needs a process manager to keep it running and a deployment mechanism to update it. Options range from Docker/container images to simple git-based deployment.

**Decision**: 
- **Process management**: systemd service unit. The service runs `bun run` with the app entrypoint, restarts on failure, and loads environment variables from the unit file or an environment file.
- **Deployment**: `git pull && bun install && systemctl restart pocket-money`. No build pipeline, no Docker, no CI/CD.
- **LXC provisioning**: Manual. Install Bun, install Tailscale, clone the repo, create the systemd unit, set env vars.

**Consequences**:
- Zero infrastructure beyond the LXC itself
- Deployment is one SSH command
- No container registry, no image builds, no orchestrator
- LXC setup is a one-time manual task — small enough that a README with steps is sufficient
- If Bun or Tailscale need updating, it's a manual SSH task
- No zero-downtime deploys — the app is briefly unavailable during restart. Acceptable for 2 users.
