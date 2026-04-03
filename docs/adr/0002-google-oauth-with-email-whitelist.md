# ADR-0002: Google OAuth with email whitelist

**Status**: Accepted

**Context**: Only two people (the user and their wife) should be able to access the app. Both have Google accounts. No registration flow, no other auth providers.

**Decision**: Use Google OAuth for authentication. Authorisation is a hardcoded whitelist of exactly two email addresses in config. Any Google account not in the whitelist is rejected at login.

**Consequences**:
- No user management UI, password reset flows, or registration needed
- Adding a third user means updating config and redeploying — acceptable for the foreseeable future
- Google handles all credential management, MFA, etc.
- Requires a Google Cloud project with OAuth credentials configured
- Callback URL must be reachable from the user's browser (see ADR-0009 for Tailscale)
