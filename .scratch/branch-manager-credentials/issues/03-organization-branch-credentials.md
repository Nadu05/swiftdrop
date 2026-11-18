# 03: Orchestrated Branch Creation & Credential Management APIs (organization-service)

**What to build:** `organization-service` requires `email` on `BranchCreateRequest`, synchronously provisions the `BRANCH_MANAGER` via `identity-service` during branch creation (aborting cleanly on duplicate email), triggers `notification-service` to email credentials while recording `PENDING`/`SENT`/`FAILED` delivery status without rolling back on mail failure, keeps later branch email edits isolated, and exposes credential management endpoints.

**Blocked by:** 01: Temporary Branch Manager Credentials & Password Change (identity-service), 02: SMTP Credential Email Delivery (notification-service & Local Dev)

**Status:** done

- [ ] `BranchCreateRequest` requires `@NotBlank @Email` for `email`
- [ ] `BranchService.create` synchronously calls `identity-service` to provision the `BRANCH_MANAGER` user; duplicate-email or identity failures abort branch creation cleanly without leaving an orphan branch
- [ ] After persistence, `organization-service` triggers `notification-service` to send the credential email and persists delivery status (`PENDING`, `SENT`, `FAILED`) and timestamp on the branch; email failure does not roll back branch or user creation
- [ ] Updating a branch's contact `email` later updates only `Branch.email` without altering the Branch Manager's login email
- [ ] Expose `GET /api/v1/branches/{id}/credentials`, `POST /api/v1/branches/{id}/credentials/resend`, `POST /api/v1/branches/{id}/credentials/reset`, and `POST /api/v1/branches/{id}/credentials/provision` (for legacy branches), restricted to `ADMIN` / `HEAD_OFFICE_ADMIN`
- [ ] Integration/MockMvc tests cover creation orchestration, duplicate-email rollback, email-failure resilience, update-email isolation, and all credential endpoints
