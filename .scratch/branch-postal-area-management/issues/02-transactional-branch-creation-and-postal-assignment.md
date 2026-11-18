# 02: Transactional Branch Creation with Exclusive Postal Area Assignment

**What to build:** Atomic branch creation with exclusive **Branch Coverage**: extend `branches` with geographical foreign keys (`province_id`, `district_id`, `ds_division_id`, `postal_code`), create `branch_postal_areas` with historical tracking columns and a partial unique index (`WHERE is_active = true`) enforcing exclusive active **Postal Area** ownership, extend `POST /branches` to accept `postalAreaIds` transactionally with `ACTIVE` coverage and `HEAD_OFFICE_ADMIN`/`ADMIN` RBAC guards, and add the **Assigned Postal Areas** multi-select section (with physical postal code auto-suggestion and non-blocking removal warning) to the Branch Creation UI.

**Blocked by:** 01: Sri Lankan Geographical Reference Data, Location APIs & Cascading Selection UI

**Status:** ready-for-agent

- [ ] Flyway migration adds `province_id`, `district_id`, `ds_division_id`, and `postal_code` to `branches`, and creates `branch_postal_areas` (`is_active`, `assigned_at`, `assigned_by`, `unassigned_at`, `unassigned_by`) with a PostgreSQL partial unique index on active `postal_area_id`.
- [ ] `POST /branches` creates the branch and its initial `branch_postal_areas` in a single transaction, rejecting `ACTIVE` branches with zero assigned Postal Areas (`400`) and rejecting Postal Areas already actively assigned to another branch (`409 Conflict` naming the conflicting postal code and branch).
- [ ] Only `HEAD_OFFICE_ADMIN` and `ADMIN` roles can create branches or assign Postal Areas; unauthorized roles (including `BRANCH_MANAGER`) receive `403 Forbidden`.
- [ ] Branch Creation UI includes the **Assigned Postal Areas** multi-select picker (search by postal code or area name, filter by province/district), displays selected areas (postal code, area, district, province) with remove controls, auto-suggests the branch's physical postal code, and shows a non-blocking warning if removed.
- [ ] Controller and service integration tests verify transactional rollback, `409 Conflict`, `403 Forbidden`, and `ACTIVE` coverage validation.
