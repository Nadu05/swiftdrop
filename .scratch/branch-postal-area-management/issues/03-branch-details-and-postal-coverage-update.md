# 03: Branch Details Postal Coverage View & Coverage Update Flow

**What to build:** Viewing and updating **Branch Coverage** after creation: add `GET /branches/{id}/postal-areas` and transactional set-sync `PUT /branches/{id}/postal-areas` (deactivating removed rows with `unassigned_at`/`unassigned_by`, preserving unchanged active rows, inserting newly added rows, rejecting cross-branch collisions with `409 Conflict`, and blocking removal of the last active Postal Area on an `ACTIVE` branch), enforce the `>= 1` active Postal Area guard when activating a branch via `PATCH /branches/{id}`, and update Branch Details and Edit Branch UIs to display and edit assigned Postal Areas with Head Office Admin RBAC enforcement.

**Blocked by:** 02: Transactional Branch Creation with Exclusive Postal Area Assignment

**Status:** ready-for-agent

- [ ] `GET /branches/{id}/postal-areas` returns active assigned Postal Areas (postal code, area name, district, province, assignment metadata).
- [ ] `PUT /branches/{id}/postal-areas` performs a transactional set-sync: removed assignments are marked `is_active = false` with `unassigned_at` and `unassigned_by` recorded; existing active assignments remain intact; new assignments fail with `409 Conflict` if actively assigned to another branch.
- [ ] `PATCH /branches/{id}` rejects transitioning a branch to `ACTIVE` if it has zero active assigned Postal Areas, and `PUT /branches/{id}/postal-areas` rejects clearing the last active Postal Area of an `ACTIVE` branch.
- [ ] Only `HEAD_OFFICE_ADMIN` and `ADMIN` roles can call `PUT /branches/{id}/postal-areas` (`403 Forbidden` for `BRANCH_MANAGER` and other roles).
- [ ] Branch Details UI displays assigned Postal Areas; Edit Branch UI allows Head Office Admins to add/remove Postal Areas with loading, empty, error, and conflict states.
