# 04: Required Branch Email & Branch Details Credentials Card (frontend Admin UI)

**What to build:** `BranchForm` requires `email` in create mode and redirects to `/organization/branches/[id]` on success; `BranchDetails` displays a **Branch Manager Credentials** card showing login email, active temporary password (with copy button) or *"Password changed by user"*, email delivery status badge, and **Resend Credentials**, **Reset & Resend Credentials**, and **Provision & Send Credentials** actions.

**Blocked by:** 03: Orchestrated Branch Creation & Credential Management APIs (organization-service)

**Status:** ready-for-agent

- [ ] `branchFormSchema` and `BranchForm` require `email` in `create` mode (optional/contact-only in `edit` mode)
- [ ] Creating a branch redirects to `/organization/branches/[id]` so the System Admin immediately sees the credentials and email status
- [ ] `BranchDetails` renders the **Branch Manager Credentials** card with all states: unprovisioned (legacy branch with **Provision & Send Credentials**), active temporary password (copyable + **Resend Credentials** + **Reset & Resend Credentials**), and password changed (*"Password changed by user"* + **Reset & Resend Credentials**), plus email delivery status badge
- [ ] `frontend` TypeScript typecheck (`tsc --noEmit`) passes cleanly
