---
status: accepted
---

# Branch Manager Provisioning and Temporary Credentials

## Context

When a System Admin (`ADMIN` / `HEAD_OFFICE_ADMIN`) creates a SwiftDrop branch with a branch email address, the system must automatically provision a **Branch Manager** (`BRANCH_MANAGER`) login account, send the login credentials to the branch's email address, and allow the System Admin to view and manage those credentials in the admin UI. `identity-service` hashes all user passwords with BCrypt (`BCryptPasswordEncoder(10)`), so plain-text passwords cannot be recovered from `passwordHash`.

## Decision

1. **Temporary Initial Password (`mustChangePassword`)**: `identity-service` generates a cryptographically random temporary password when provisioning or resetting a Branch Manager account, stores its BCrypt hash in `passwordHash`, sets `mustChangePassword = true`, and stores the temporary password in a dedicated retrievable field solely until the Branch Manager sets their own password. Once the Branch Manager changes their password, the temporary password is cleared and `mustChangePassword` becomes `false`; System Admins then see that the password was changed by the user rather than seeing their private password.
2. **Backend Orchestration (`organization-service` → `identity-service` → `notification-service`)**: `organization-service` synchronously calls `identity-service` during branch creation to provision the `BRANCH_MANAGER` user using the branch's email as its login email. If `identity-service` rejects the request (e.g., duplicate email), branch creation fails cleanly without leaving an orphan branch. After the branch and account are persisted, `notification-service` sends the credentials email via `spring-boot-starter-mail` and the delivery status (`PENDING`, `SENT`, `FAILED`) is recorded so failures never roll back branch creation and can be retried via **Resend Credentials**.

## Considered Options

- **Reversible password encryption for all passwords**: rejected because storing decryptable user passwords violates standard credential security practices and exposes user-chosen passwords.
- **Frontend-orchestrated two-step creation (`createBranch` then `createAdminUser`)**: rejected because a duplicate-email failure in `identity-service` would leave an orphaned branch without a Branch Manager.
- **Rolling back branch creation if SMTP fails**: rejected because transient mail server outages should not block operational branch setup when the System Admin can view and resend credentials.

## Consequences

- `BranchCreateRequest` and `BranchForm` (create mode) require `email` so every new branch has a destination for Branch Manager provisioning and credential delivery.
- Updating a branch's contact `email` later updates only the branch record and does not silently alter the existing Branch Manager's login email.
- Legacy branches without a provisioned Branch Manager remain valid and can be provisioned on demand from the Branch Details UI.
