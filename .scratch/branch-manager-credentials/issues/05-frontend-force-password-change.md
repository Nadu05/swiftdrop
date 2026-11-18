# 05: First-Login Password Change Flow (frontend Auth UI)

**What to build:** When a Branch Manager logs in with `mustChangePassword = true`, the frontend prompts/requires them to set a new personal password before continuing to the portal, calling the change-password endpoint so the temporary password is cleared on the backend.

**Blocked by:** 01: Temporary Branch Manager Credentials & Password Change (identity-service)

**Status:** done

- [ ] Login flow reads `mustChangePassword` from the auth response and redirects/prompts the user to change their temporary password before accessing the dashboard
- [ ] Password change form validates policy requirements, calls `identity-service` change-password endpoint, and completes login into the branch portal
- [ ] `frontend` TypeScript typecheck (`tsc --noEmit`) passes cleanly
