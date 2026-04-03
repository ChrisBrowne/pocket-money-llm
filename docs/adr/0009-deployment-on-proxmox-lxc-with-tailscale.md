# ADR-0009: Deployment on Proxmox LXC with Tailscale

## Status

Accepted

## Context

The user runs a Proxmox server at home and uses Tailscale on their devices for network access. Google OAuth requires a callback URL reachable by the user's browser. The user has custom hostnames (e.g. `pocketmoney.brownehq/`) via a local hosts file.

## Decision

Deploy in a Proxmox LXC container. Use Tailscale MagicDNS (e.g. `pocketmoney.tail*.ts.net`) as the canonical hostname for Google OAuth callback registration, since Google may reject non-standard TLDs. The custom hosts file hostname can still be used for day-to-day access if desired, but OAuth redirect URIs must use the Tailscale hostname.

## Consequences
- OAuth callbacks work because Tailscale provides a real, resolvable domain
- Access is limited to devices on the Tailnet — no public internet exposure
- The LXC gets Tailscale installed and a stable MagicDNS name
- SQLite DB lives local to the LXC filesystem; JSON exports go to a network-mounted share from the Windows host (Backblaze-backed)
- The custom `.brownehq/` hostname works for bookmarks and casual access but is not used in OAuth configuration
- See ADR-0019 for process management (systemd) and deployment mechanism (git pull)
