# Deployment

How to take a bare Proxmox host to a running Pocket Money Tracker. The split between runbook and Makefile targets follows [ADR-0033](adr/0033-provisioning-split-runbook-and-makefile.md): host-side work, pre-clone bootstrap, and Web UI / secret steps are documented here; repo-installable artifacts are provisioned via `make`.

## Overview

The deployed shape (per [ADR-0009](adr/0009-deployment-on-proxmox-lxc-with-tailscale.md), [ADR-0019](adr/0019-deployment-systemd-git-pull.md), [ADR-0031](adr/0031-https-via-tailscale-serve.md)):

- The app runs in an unprivileged Proxmox LXC.
- A `pocket-money` system user owns the code at `/opt/pocket-money` and the SQLite database at `/var/lib/pocket-money/`.
- systemd (`pocket-money.service`) runs `bun src/index.tsx`, bound to `127.0.0.1`.
- Tailscale on the LXC exposes the app to the tailnet via `tailscale serve` — automatic HTTPS, MagicDNS hostname, no public internet exposure.
- Google OAuth authenticates parents; an email allowlist restricts who can use the app.
- A daily cron inside the LXC calls `/api/backup` over loopback and writes JSON to a bind-mounted Windows SMB share, which is itself backed up to Backblaze.

## Prerequisites

- Proxmox host with a network bridge (typical `vmbr0`) and outbound internet.
- Tailscale account with the tailnet's HTTPS Certificates feature enabled (one-time, see [step D.1](#d1-enable-https-certificates-in-the-tailnet)).
- Google Workspace account if you want to use OAuth User Type "Internal" (one less verification hassle); a regular Google account works with "External" but adds test-user management.
- A Windows host on the LAN with a share that's covered by Backblaze, and an SMB credentials file on the Proxmox host (`/root/.smbcredentials` or similar).

---

## Category A — Proxmox host

Everything in this section runs on the Proxmox host itself, as root.

### A.1 Load the `tun` kernel module

Tailscale needs `/dev/net/tun`. Most Proxmox installs don't have the module loaded by default.

```bash
modprobe tun
echo tun > /etc/modules-load.d/tun.conf      # persist across reboots
lsmod | grep tun                              # verify loaded
ls -l /dev/net/tun                            # verify device exists
```

### A.2 Mount the Windows SMB share for backups

Skip if you already have a working share mount (e.g. for other LXCs). Otherwise add a line like this to `/etc/fstab`:

```
//<windows-host-ip>/<share-name> /mnt/<mountpoint> cifs credentials=/root/.smbcredentials,_netdev,x-systemd.automount,noatime,rw,uid=100000,gid=100000,file_mode=0770,dir_mode=0770 0 0
```

Key options: `uid=100000,gid=100000` map the share's host-side ownership to "root inside an unprivileged LXC". `file_mode=0770,dir_mode=0770` enforces group-write semantics regardless of any chmod inside the container.

```bash
mkdir -p /mnt/<mountpoint>
mount -a
ls -la /mnt/<mountpoint>                      # should list share contents
```

Create the destination folder for our backups on the share:

```bash
mkdir -p /mnt/<mountpoint>/path/to/pocket-money-backups
```

### A.3 Create the LXC

In the Proxmox web UI, "Create CT":

- **Template**: Ubuntu 24.04 or similar minimal Debian/Ubuntu.
- **Disk**: 4 GB is plenty.
- **CPU**: 1 vCPU.
- **Memory**: 512 MB.
- **Network**: `eth0`, bridge `vmbr0`, IPv4 = **DHCP** (forgetting this leaves the container with no network — wrinkle 1).
- **Unprivileged**: yes (default).

### A.4 Edit the LXC config for TUN + backup mount

Stop the LXC, then edit `/etc/pve/lxc/<vmid>.conf`:

```
features: nesting=1
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
mp0: /mnt/<mountpoint>/path/to/pocket-money-backups,mp=/mnt/backups
```

The three `tun`-related lines let Tailscale work inside the container (wrinkle 2). The `mp0` line bind-mounts the share's backup folder to `/mnt/backups` inside the container.

Start the LXC again.

---

## Category B — In-LXC bootstrap (pre-clone)

Everything in this section runs **inside the LXC** as root. You can't `make` anything yet — the Makefile doesn't exist until we clone the repo.

### B.1 Install base utilities

Fresh Ubuntu LXC templates are minimal. The following packages aren't there by default and we need each of them later (wrinkles 4, 5):

```bash
apt update
apt install -y curl unzip git make
```

### B.2 Install Bun

The official installer drops the binary into the running user's `~/.bun/bin/`. As root, that's `/root/.bun/bin/bun` — but `/root` is mode 700, so the `pocket-money` service user can't traverse it (wrinkle 3). Install, then **copy** (don't symlink) the binaries to `/usr/local/bin`:

```bash
curl -fsSL https://bun.sh/install | bash
cp /root/.bun/bin/bun /usr/local/bin/bun
cp /root/.bun/bin/bunx /usr/local/bin/bunx
chmod 755 /usr/local/bin/bun /usr/local/bin/bunx
bun --version                                 # verify
```

Both `bun` and `bunx` are needed — `bunx` is invoked by the Tailwind CSS build (wrinkle 6).

### B.3 Install Tailscale and join the tailnet

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up                                  # follow the auth URL
tailscale status                              # confirm connected
tailscale ip -4                               # note your tailnet IP
```

Take note of the MagicDNS hostname Tailscale assigns — e.g. `pocketmoneytracker.tail1234.ts.net`. You'll need it twice: in `tailscale serve`, and in the Google OAuth callback URL.

### B.4 Set up HTTPS via `tailscale serve`

Before this works, the tailnet's HTTPS Certificates feature must be enabled in the admin console — see [step D.1](#d1-enable-https-certificates-in-the-tailnet) and come back here.

```bash
tailscale cert <magicdns-hostname>            # smoke test — should fetch a cert
rm <magicdns-hostname>.crt <magicdns-hostname>.key    # tidy up the test cert

tailscale serve --bg --https=443 http://127.0.0.1:3000
tailscale serve status                        # verify proxy in place
```

`--bg` persists the configuration across reboots. The proxy targets `127.0.0.1:3000` because the app binds only to loopback ([ADR-0031](adr/0031-https-via-tailscale-serve.md)).

### B.5 Create the service user and directories

```bash
useradd --system --shell /usr/sbin/nologin --no-create-home pocket-money
mkdir -p /opt/pocket-money /var/lib/pocket-money
chown pocket-money:pocket-money /opt/pocket-money /var/lib/pocket-money
chmod 750 /var/lib/pocket-money
```

`/opt/pocket-money` stays at default `755` (code, not secret); `/var/lib/pocket-money` is `750` (the SQLite DB inevitably contains child names and transactions we'd rather lock down).

### B.6 Clone the repo

Clone **as the service user** so files end up with the right ownership from the start:

```bash
sudo -u pocket-money git clone https://github.com/<your-user>/pocket-money-tracker.git /opt/pocket-money
sudo -u pocket-money bun install --cwd /opt/pocket-money
```

If you `git pull` as root later, you'll get "fatal: detected dubious ownership" (wrinkle 7) — git refusing to operate on a repo owned by another user. Always operate on the repo as the `pocket-money` user.

---

## Category D — Web UI and secrets

### D.1 Enable HTTPS Certificates in the tailnet

In <https://login.tailscale.com/admin/dns>, find the "HTTPS Certificates" section and enable it. This is per-tailnet, one-time. Without it, `tailscale cert` and `tailscale serve --https` will fail.

### D.2 Create the Google OAuth client

In <https://console.cloud.google.com>:

1. **New Project** named something like "Pocket Money Tracker".
2. **APIs & Services → OAuth consent screen**:
   - **User Type**: Internal if you have Workspace and the only users are in your domain (cleanest — no unverified-app warning, no test users to manage). External otherwise.
   - **App information**: app name, support email.
   - **Scopes**: add `userinfo.email` and `userinfo.profile`.
   - **Test users**: required only for External — add every email that will use the app.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - **Application type**: Web application.
   - **Authorized redirect URIs**: `https://<magicdns-hostname>/auth/callback` — must match `GOOGLE_REDIRECT_URI` in `.env` byte-for-byte.
4. Copy the **Client ID** and **Client Secret** from the modal.

### D.3 Populate `.env` on the LXC

As the service user, copy and edit:

```bash
sudo -u pocket-money cp /opt/pocket-money/.env.example /opt/pocket-money/.env

# Generate fresh secrets (don't reuse from dev)
openssl rand -base64 32       # → COOKIE_SECRET
openssl rand -base64 32       # → BACKUP_API_KEY
```

Edit `/opt/pocket-money/.env` as root (file is owned by `pocket-money`, but root can write):

| Variable               | Value                                                         |
| ---------------------- | ------------------------------------------------------------- |
| `DATABASE_PATH`        | `/var/lib/pocket-money/pocket-money.db`                       |
| `COOKIE_SECRET`        | first `openssl` output                                        |
| `BACKUP_API_KEY`       | second `openssl` output                                       |
| `ALLOWED_EMAILS`       | comma-separated emails — must include every authorised parent |
| `GOOGLE_CLIENT_ID`     | from D.2                                                      |
| `GOOGLE_CLIENT_SECRET` | from D.2                                                      |
| `GOOGLE_REDIRECT_URI`  | `https://<magicdns-hostname>/auth/callback`                   |
| `DEV_MODE`             | leave commented (defaults to `false`)                         |

Lock down the file (secrets):

```bash
chmod 600 /opt/pocket-money/.env
chown pocket-money:pocket-money /opt/pocket-money/.env
```

---

## Category C — Provision (one command)

With `.env` in place, install the systemd unit, sudoers entry, and backup cron in one go. Run as root:

```bash
sudo make -C /opt/pocket-money provision
```

That target runs `install-systemd-unit`, `install-sudoers`, and `install-cron` in order. Each is idempotent — safe to re-run if you change `scripts/pocket-money.service`, `scripts/deploy.sudoers`, or `scripts/backup.cron` later.

### First start

`make provision` installs the systemd unit but doesn't build the CSS or start the service. Use `make deploy` for that — it builds the CSS, then restarts the (currently stopped) unit. The same target handles every subsequent code change too — "land code on the box" is always `make deploy`, first time or hundredth.

```bash
sudo -u pocket-money make -C /opt/pocket-money deploy
systemctl status pocket-money
journalctl -u pocket-money -n 30 --no-pager
```

`git pull` and `bun install` inside the target are no-ops on first run (bootstrap step B.6 already did them); `make build` creates the CSS; `systemctl restart` on a stopped unit starts it just as well as it restarts a running one.

You're looking for a Pino startup line: `port: 3000`, `devMode: false`, the right DB path.

---

## Verification

### The app

From any device on your tailnet:

```
https://<magicdns-hostname>/
```

Expected flow: Google sign-in → consent → bounce to `/auth/callback` → home page (empty state, styled).

### The bind

Inside the LXC:

```bash
ss -tlnp | grep 3000                          # should show 127.0.0.1:3000 only
```

If you see `0.0.0.0:3000` instead, the localhost bind change from ADR-0031 didn't make it onto the running service — `make deploy` to land it.

### A backup

Force a manual backup run to confirm the script + share mount + API key all work together:

```bash
/opt/pocket-money/scripts/backup.sh
ls -lh /mnt/backups/                          # should show pocket-money-YYYY-MM-DDTHH-MM-SS.json
```

The scheduled cron will run at 03:00 UTC daily; check `/var/log/syslog` afterwards for the entry.

---

## Regular ops

### Deploy a code change

On the LXC, as the service user (with the sudoers entry from `install-sudoers` providing the restart permission):

```bash
sudo -u pocket-money make -C /opt/pocket-money deploy
```

This does `git pull && bun install && make build && sudo systemctl restart pocket-money`.

### Watch logs

```bash
journalctl -u pocket-money -fn 50
```

### Update a Category C artifact

Edit the artifact in `scripts/`, commit, push, deploy, then re-run the relevant install target:

```bash
sudo -u pocket-money make -C /opt/pocket-money deploy
sudo make -C /opt/pocket-money install-systemd-unit    # or install-sudoers, or install-cron
```

Or just `sudo make provision` to reinstall all three. Both are idempotent.

---

## Wrinkles to watch for

These bit us during the first install. Knowing about them up front saves debugging time.

1. **LXC has no networking after first boot.** Easy to miss `ip=dhcp` when creating the LXC. Symptom: `ping 192.168.1.1` returns "Network is unreachable". Recreate or `pct set <vmid> -net0 name=eth0,bridge=vmbr0,ip=dhcp` and restart.

2. **`tailscaled` fails: `/dev/net/tun does not exist`.** LXC container can't access the TUN device. Fix on the host: `modprobe tun` (+ persist), and add the three `lxc.*` lines plus `features: nesting=1` to the LXC conf. See [A.1](#a1-load-the-tun-kernel-module) and [A.4](#a4-edit-the-lxc-config-for-tun--backup-mount).

3. **`sudo -u pocket-money bun install` returns "Permission denied".** Bun installer drops the binary in `/root/.bun/bin/bun`, but `/root` is mode 700. Symlinking from `/usr/local/bin` doesn't help — the service user still can't traverse `/root`. **Copy** the binary, don't symlink. See [B.2](#b2-install-bun).

4. **`make: bunx: No such file or directory`.** Same wrinkle as 3, second instance. The Tailwind CSS build runs `bunx`, which is a separate binary in `/root/.bun/bin/`. Copy it to `/usr/local/bin` alongside `bun`.

5. **`git pull` as root fails with "dubious ownership".** Repo is owned by `pocket-money`; git refuses to operate when run as a different user. Always operate on the repo as the service user (`sudo -u pocket-money git pull`, or run `make deploy` as the service user — which does the right thing).

6. **OAuth "Access blocked: This app's request is invalid".** Two causes:
   - `GOOGLE_REDIRECT_URI` in `.env` doesn't match what's registered in Google Cloud Console — must be byte-for-byte identical.
   - For User Type "External" + Testing, the authenticating email isn't in the test-users list. Add it, or switch to "Internal" if you have Workspace.

7. **`tailscale cert` fails: "no TLS certs".** Tailnet doesn't have HTTPS Certificates enabled. See [D.1](#d1-enable-https-certificates-in-the-tailnet).

8. **Backup script fails: "Permission denied" writing to `/mnt/backups`.** The share is mounted with `uid=100000,gid=100000` (root in an unprivileged LXC). The backup script runs as root inside the LXC (via cron's `0 3 * * * root …` entry), which is exactly UID 100000 on the host. If you accidentally run it as the `pocket-money` user (UID 999 in container = 100999 on host), the write is rejected.
