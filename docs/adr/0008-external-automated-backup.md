# ADR-0008: External automated backup via cron

**Status**: Accepted

**Context**: Daily backups are wanted so there are restore points if something goes wrong. This could be built into the app (internal scheduler) or handled externally (cron job calling the export API).

**Decision**: Automated backup is external to the app. A cron job (or systemd timer) on the Proxmox host calls the app's export API endpoint and saves the datetime-stamped JSON file to the network share backed by Backblaze.

**Consequences**:
- App stays simple — no internal scheduler, no awareness of backup timing or storage location
- Backup runs even if the app logic changes, as long as the export API contract holds
- Cron job needs authentication (a valid session or API key for an authorised parent)
- Backup retention policy is managed at the filesystem/cron level, not in the app
- If the app is down, the cron job fails and the gap is visible in the file timestamps
