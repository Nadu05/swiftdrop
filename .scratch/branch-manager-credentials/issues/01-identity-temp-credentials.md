# 01: Temporary Branch Manager Credentials & Password Change (identity-service)

**What to build:** `identity-service` can provision a `BRANCH_MANAGER` user account for a branch with a generated policy-compliant temporary initial password (`mustChangePassword = true`), return active temporary credential status for a branch, reset credentials to a new temporary password, and clear the stored temporary password when the user changes their password on login.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `User` entity and Flyway migration track `mustChangePassword` and a retrievable temporary initial password field (stored only while `mustChangePassword` is `true`)
- [ ] Provisioning endpoint creates a `BRANCH_MANAGER` user for a given `branchId` and `email` with a generated temporary password, returning `409 Conflict` if the email already exists
- [ ] Credential lookup and reset endpoints (restricted to `ADMIN` / `HEAD_OFFICE_ADMIN`) return login email, `mustChangePassword`, and active temporary password (or `null` when changed), and reset generates a fresh temporary password
- [ ] Login response exposes `mustChangePassword`, and password-change endpoint verifies current password, updates `passwordHash`, sets `mustChangePassword = false`, and clears the stored temporary password
- [ ] Integration/MockMvc tests cover provisioning, duplicate email conflict, reset, login `mustChangePassword` flag, and password change clearing temporary password
