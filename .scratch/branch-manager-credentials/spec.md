Status: ready-for-agent

# Branch Manager Provisioning, Credential Viewing, and Email Delivery

## Problem Statement

When a System Admin (`ADMIN` or `HEAD_OFFICE_ADMIN`) creates a new SwiftDrop branch, they currently have to manually create a separate **Branch Manager** (`BRANCH_MANAGER`) user account in user management and manually communicate the login details. There is no automated email delivery of credentials to the branch's email address, and no way for a System Admin to view, resend, or reset a branch's Branch Manager login credentials directly from the branch management screens.

## Solution

Automatically provision one **Branch Manager** (`BRANCH_MANAGER`) user account whenever a branch is created (using the branch's required email address as its login email), generate a temporary initial password (`mustChangePassword = true`), and email the credentials to the branch's email address via `notification-service` (configured with `spring-boot-starter-mail`). On the Branch Details page, display a **Branch Manager Credentials** card showing the login email, active temporary password (until changed by the user), email delivery status, and actions to **Resend Credentials**, **Reset & Resend Credentials**, or **Provision & Send Credentials** (for legacy branches).

## User Stories

1. As a System Admin, I want `email` to be required when creating a new branch, so that every new branch has a valid destination for its Branch Manager account and credential email.
2. As a System Admin, I want branch creation to automatically provision one `BRANCH_MANAGER` user account using the branch's email address, so that I do not have to create the user separately.
3. As a System Admin, I want branch creation to fail cleanly with a validation error if the branch email is already registered to an existing user, so that no orphan branch is created without a Branch Manager.
4. As a System Admin, I want the newly generated login email and temporary initial password to be emailed to the branch's email address upon branch creation, so that the branch receives its access details automatically.
5. As a System Admin, I want branch creation to succeed even if the email server is temporarily unavailable, while recording the delivery failure status, so that an SMTP outage does not block branch setup.
6. As a System Admin, I want to be redirected to the Branch Details page immediately after creating a branch, so that I can immediately see the Branch Manager's login credentials and email delivery status.
7. As a System Admin, I want to view the Branch Manager's login email, active temporary password, and email delivery status on the Branch Details page, so that I can verify or share credentials if needed.
8. As a System Admin, I want to click **Resend Credentials** while the temporary password is still active, so that I can retry sending the email after a transient failure or missed email.
9. As a System Admin, I want to click **Reset & Resend Credentials** at any time, so that I can issue a fresh temporary password and email it if a Branch Manager forgets their password or was locked out.
10. As a System Admin, I want to click **Provision & Send Credentials** on legacy branches that have no Branch Manager account yet, so that older branches can be onboarded into the same workflow.
11. As a System Admin, I want editing a branch's contact email later to update only the branch record without silently changing the Branch Manager's login email, so that existing logins are not accidentally broken.
12. As a Branch Manager, I want to log in using my emailed temporary password and be prompted/required to set a new personal password (`mustChangePassword`), so that my account is secured and my personal password is never visible to admins.
13. As a System Admin, I want the Branch Details page to show *"Password changed by user"* (hiding the password) once the Branch Manager has set their own password, so that user privacy and security are preserved.

## Implementation Decisions

- **Canonical Role**: Use the existing `BRANCH_MANAGER` role across `identity-service`, `organization-service`, and `frontend` (per `GLOSSARY.md`; no separate `BRANCH_ADMIN` role).
- **Required Branch Email on Create**: Make `email` required on `BranchCreateRequest` and in `BranchForm` create mode. Editing `email` in update mode updates only the branch's contact email.
- **Backend Orchestration**:
  - `organization-service` calls `identity-service` synchronously during branch creation (and on-demand provisioning for legacy branches) to create the `BRANCH_MANAGER` user with `branchId` set to the new branch. If `identity-service` rejects (e.g., duplicate email), `organization-service` aborts/rolls back branch creation and returns the conflict/validation error.
  - After persistence, `organization-service` triggers `notification-service` to send the credential email and stores/updates the credential email delivery status (`PENDING`, `SENT`, `FAILED`) and timestamp. Email failures are caught and recorded rather than rolling back branch or user creation.
- **Temporary Credentials & Password Change (`identity-service`)**:
  - `User` tracks `mustChangePassword` (boolean) and a temporary initial password field stored only while `mustChangePassword` is `true`.
  - When `identity-service` provisions or resets a Branch Manager's credentials, it generates a policy-compliant temporary password, stores its BCrypt hash in `passwordHash`, sets `mustChangePassword = true`, and stores the temporary password for System Admin retrieval.
  - Authentication/login exposes `mustChangePassword` to the frontend, and a password-change flow verifies the current password, updates `passwordHash`, sets `mustChangePassword = false`, and clears the stored temporary password.
- **Real Email Delivery (`notification-service`)**:
  - Add `spring-boot-starter-mail` (`JavaMailSender`) to `notification-service` implementing `NotificationSenderPort` for email delivery, configurable via standard `SPRING_MAIL_*` environment variables.
  - Add a local Mailpit (or MailHog) SMTP container to local dev `docker-compose` configuration for end-to-end local testing.
- **Admin UI (`frontend`)**:
  - Update `BranchForm` (create mode) to require `email` and redirect to `/organization/branches/[id]` on success.
  - Add a **Branch Manager Credentials** section to `BranchDetails` displaying login email, active temporary password (with copy button) or *"Password changed by user"*, email delivery status badge, and **Resend Credentials**, **Reset & Resend Credentials**, and **Provision & Send Credentials** actions.
  - Enforce/prompt password change on login when `mustChangePassword` is `true`.

## Testing Decisions

- **Testing Seams**:
  - **`organization-service` API/Integration Seam**: Test `BranchController` (`POST /api/v1/branches`, `GET /api/v1/branches/{id}/credentials`, `POST /api/v1/branches/{id}/credentials/resend`, `POST /api/v1/branches/{id}/credentials/reset`, `POST /api/v1/branches/{id}/credentials/provision`) with `IdentityServiceClient` and `NotificationServiceClient` stubbed/mocked at the HTTP/messaging boundary, verifying duplicate-email rollback, email-failure resilience (`FAILED` status without rollback), and update-email isolation.
  - **`identity-service` API/Integration Seam**: Test `AdminController` / internal provisioning & reset endpoints and `AuthController` (`login` returning `mustChangePassword: true`, `change-password` clearing the temporary password and flipping `mustChangePassword` to `false`).
  - **`notification-service` Seam**: Test `NotificationService` / email sender against a mocked `JavaMailSender` (verifying recipient = branch email, subject, and credential body) and `LoggingNotificationSender` fallback when mail is disabled.
  - **`frontend` Typecheck & Component Seam**: Verify TypeScript compilation (`tsc --noEmit`) and form/UI behavior for required branch email, credential card states, and first-login password change flow.
- **Prior Art**: Follow existing Spring Boot `@WebMvcTest` / `@SpringBootTest` + MockMvc patterns in `services/organization-service/src/test` and `services/identity-service/src/test`.
- Only test external behavior (HTTP status codes, response payloads, persisted state, mail sender invocation) rather than internal implementation details.

## Out of Scope

- Supporting multiple Branch Manager accounts per branch from the branch creation form (additional managers can still be created manually in User Management).
- Changing a Branch Manager's login email automatically when a branch's contact email is edited.
- Email templates with external SaaS providers (SendGrid/SES SDKs) beyond standard SMTP (`spring-boot-starter-mail`).

## Further Notes

- Related ADR: `docs/adr/0003-branch-manager-provisioning-and-temporary-credentials.md`
- Domain Glossary: `GLOSSARY.md` (`Branch Manager`)
