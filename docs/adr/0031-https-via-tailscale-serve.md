# ADR-0031: HTTPS termination via Tailscale Serve

## Status

Accepted

## Context

ADR-0009 settled on Proxmox LXC + Tailscale MagicDNS as the deployment target and OAuth callback hostname, but left the question of TLS termination open. HTTPS is non-negotiable for two reasons:

- Google OAuth refuses non-HTTPS redirect URIs (except `http://localhost` for local dev, which doesn't apply here).
- Session cookies are marked `Secure` in production (ADR-0016), so they aren't sent over plain HTTP at all.

The realistic options:

1. **`tailscale serve`** — Tailscale provisions a real LetsEncrypt cert for the MagicDNS name and proxies HTTPS on the tailnet to a local backend. The cert is renewed automatically. Reachable only from devices on the tailnet.
2. **`tailscale funnel`** — same cert mechanism, but exposes the service to the public internet via Tailscale's edge.
3. **A separate reverse proxy** (nginx, Caddy) inside the LXC, with its own cert management (LetsEncrypt via DNS-01, since the LXC isn't reachable from the public internet for HTTP-01).

ADR-0009 is explicit that "access is limited to devices on the Tailnet — no public internet exposure". That rules out `tailscale funnel`. A separate reverse proxy is workable but adds a daemon, a config file, and a cert renewal mechanism that Tailscale would otherwise handle for free.

A separate concern: with TLS termination happening in front of the app, the Bun process should not also be reachable directly. Elysia binds to `0.0.0.0` by default, which means the unencrypted port is reachable on every interface of the LXC — including the tailnet interface, where other tailnet devices could hit the app bypassing TLS.

## Decision

Use `tailscale serve` for HTTPS termination. The Bun app listens on `127.0.0.1` only; `tailscale serve` proxies `https://<magicdns-name>/` to `http://127.0.0.1:${PORT}`.

### Tailnet configuration

HTTPS Certificates must be enabled for the tailnet (one-time, admin console at `https://login.tailscale.com/admin/dns`). Without this, `tailscale cert` cannot mint certificates and `tailscale serve` will not serve HTTPS.

### LXC configuration

```
tailscale serve --bg --https=443 http://127.0.0.1:3000
```

`--bg` persists the configuration across reboots. `tailscale serve status` shows the active routes. Cert provisioning and renewal are handled by Tailscale — no cron, no certbot, no manual rotation.

### App binding

The Elysia `.listen()` call binds to `127.0.0.1`, not the default `0.0.0.0`. This ensures the unencrypted port is only reachable from the LXC's loopback interface — `tailscale serve` reaches it via loopback, but no other tailnet device can.

### Funnel is forbidden

`tailscale funnel` must not be enabled for this service. ADR-0009's "no public internet exposure" stance is the binding constraint.

## Consequences

- HTTPS works on the MagicDNS hostname with no cert management effort. The OAuth callback URL (`GOOGLE_REDIRECT_URI`) uses `https://<magicdns-name>/auth/callback` (ADR-0009, ADR-0027).
- The LXC has no public internet exposure; access remains tailnet-only (preserves ADR-0009).
- One less daemon to run, configure, and update inside the LXC — no nginx, no Caddy, no certbot.
- The app's `listen()` call must bind to `127.0.0.1`. This is a code change in `src/index.tsx` and is required before this ADR is fully realised in production.
- Cert renewal depends on Tailscale being operational. If Tailscale changes its cert policy or has an outage at renewal time, HTTPS may fail. Renewal is aggressive (well in advance of expiry), so transient outages are tolerable; a sustained failure would be visible via `tailscale serve status` and the journal.
- The `tailscale serve` configuration is per-machine state, not part of the repo. Re-provisioning the LXC means re-running the `tailscale serve --bg` command. This is captured in deployment notes rather than as repo configuration, consistent with the manual-LXC-provisioning stance of ADR-0019.
- If the deployment target ever changes (e.g. away from Tailscale), TLS termination has to be rethought. This ADR is tightly coupled to ADR-0009; superseding one likely supersedes the other.
