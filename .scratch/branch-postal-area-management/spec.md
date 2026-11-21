Status: ready-for-agent

# Branch Creation with Sri Lankan Postal Area Management

## Problem Statement

Head Office Administrators in SwiftDrop currently create and manage branches using only free-text city names and raw latitude/longitude coordinates, while branch coverage is modeled as circular Haversine radius zones (`service_areas`). This has three operational problems:

1. Branches cannot be anchored to Sri Lanka's official **Administrative Divisions** (Province, District, DS Division) or **Postal Areas**.
2. Multiple branches can accidentally overlap on the same locality because circular radius zones do not enforce exclusive **Branch Coverage**.
3. When customers or merchants request quotes or create orders, the Order Service resolves pickup and destination branches purely by approximate coordinates rather than deterministic Sri Lankan postal codes, risking misrouted parcels or silent fallback to the wrong branch.

## Solution

Introduce authoritative Sri Lankan geographical reference data (Provinces, Districts, DS Divisions, GN Divisions, and validated **Postal Areas**) into the Organization Service, imported via a repeatable, validated ETL pipeline. Extend Branch creation and management so Head Office Administrators can select a branch's cascading administrative location, assign multiple **Postal Areas** with exclusive active **Branch Coverage** and historical tracking, and enforce that operational branches cover at least one **Postal Area**. Update Order Service quotation and order creation—along with the booking and branch admin UIs—to resolve origin and destination branches strictly by pickup and drop-off postal codes, returning an explicit unsupported-service-area error when a postal code has no active assigned branch.

## User Stories

1. As a Head Office Administrator, I want to import verified Sri Lankan Administrative Divisions and Postal Areas into the Organization Service database idempotently, so that branch and order workflows use real, normalized geographical data without runtime external API dependencies.
2. As a Head Office Administrator, I want the data-import process to validate postal codes against official Sri Lanka Post references and output an import report of accepted, rejected, and conflicting records, so that unverified postal codes never enter production.
3. As a Head Office Administrator, I want to re-run geographical dataset imports when new divisions or postal codes are published without overwriting or destroying existing branch postal-area assignments, so that coverage history stays intact.
4. As a Head Office Administrator, I want to select a branch's Province, District, and DS Division via cascading searchable dropdowns when creating a branch, so that branch location data is standardized and accurate.
5. As a Head Office Administrator, I want the branch's latitude and longitude to auto-populate from the selected geographical location while remaining editable, so that inter-branch distance pricing continues to work without manual coordinate lookup.
6. As a Head Office Administrator, I want to enter the branch's physical postal code and have it automatically suggested in the Assigned Postal Areas list, so that common single-branch setups take fewer clicks.
7. As a Head Office Administrator, I want to see a non-blocking warning if I remove the branch's physical postal code from its Assigned Postal Areas, so that I can still configure hub-only branches intentionally while avoiding accidental omissions.
8. As a Head Office Administrator, I want to search Postal Areas by 5-digit postal code or area name and filter them by Province, District, DS Division, or GN Division, so that I can quickly find all localities a branch should serve.
9. As a Head Office Administrator, I want to assign multiple Postal Areas to a branch during creation and review or remove selected areas before saving, so that branch creation and initial coverage setup happen in one atomic transaction.
10. As a Head Office Administrator, I want the system to block creating an active branch or activating an inactive branch if it has zero active assigned Postal Areas, so that no operational branch exists without coverage.
11. As a Head Office Administrator, I want the system to reject assigning a Postal Area that is already actively assigned to another branch with a clear conflict error naming the postal code and conflicting branch, so that exclusive Branch Coverage is guaranteed.
12. As a Head Office Administrator, I want to view a branch's assigned Postal Areas (code, area name, district, province) on the branch details page, so that operational staff and admins can audit coverage at a glance.
13. As a Head Office Administrator, I want to update a branch's assigned Postal Areas later while preserving historical assignment timestamps and actors for removed areas, so that coverage changes are auditable over time.
14. As a Branch Administrator or Branch Manager, I want to be prevented from creating branches or modifying any branch's Postal Area assignments on both the UI and backend API, so that territorial coverage remains centrally governed by Head Office.
15. As a Customer or Merchant booking a delivery, I want to select or enter pickup and drop-off Sri Lankan postal codes when requesting a quote and creating an order, so that my order is deterministically routed to the correct origin and destination branches.
16. As a Customer or Merchant, I want to receive a clear, actionable unsupported-service-area message when my pickup or drop-off postal code has no active assigned branch, so that the system never silently assigns a random branch.
17. As an Order Service consumer, I want pickup and destination branch IDs, codes, and names resolved by postal code and persisted on the order, so that downstream dispatch and inter-branch transfer manifests operate on authoritative branch assignments.

## Implementation Decisions

- **Geographical Schema & Canonical Postal Areas**:
  - Add normalized tables in the Organization Service database: `provinces`, `districts`, `ds_divisions`, `gn_divisions`, and `postal_areas`, managed via Flyway schema migrations (no bulk data in Flyway scripts).
  - Each `postal_areas` record represents one canonical Sri Lankan 5-digit `postal_code` (unique constraint), with `area_name`, `province_id`, `district_id`, optional `ds_division_id`, optional centroid `latitude`/`longitude`, `is_active`, and source attribution (`source_name`, `source_reference`, `import_version`).
  - `gn_divisions` holds an optional reference to `postal_code` / `postal_areas` where provided by the source dataset; cascading UI filtering uses GN-to-Postal-Area links when available and falls back to DS Division or District Postal Areas when GN-level mapping is absent.
- **Branch & Exclusive Coverage Schema**:
  - Extend `branches` with `province_id`, `district_id`, `ds_division_id`, and `postal_code`. Retain `latitude` and `longitude` for inter-branch distance calculation, and keep Branch Manager user assignment in the Identity Service.
  - Add `branch_postal_areas` (`branch_id`, `postal_area_id`, `is_active`, `assigned_at`, `assigned_by`, `unassigned_at`, `unassigned_by`) with a PostgreSQL partial unique index (`UNIQUE (postal_area_id) WHERE is_active = true`) to enforce exclusive active Branch Coverage at the database level while retaining full assignment history.
  - Retain the legacy `service_areas` table and read endpoints untouched for backward compatibility (`ADR-0002`).
- **Controlled Dataset Import Pipeline**:
  - Build a repeatable Python ETL and validation script that ingests Open Admin Data (Provinces, Districts, DS Divisions, GN Divisions), `slwdc/Postal-Codes`, and Sri Lanka Post / Lanka Data Layer validation references, normalizes names and 5-digit postal codes, outputs a curated versioned dataset bundle and an import validation report (`imported`, `rejected`, `conflicts`), and never emits unverified postal codes.
  - Pair the curated bundle with an idempotent Spring Boot `geo-import` profile runner that upserts geographical tables into PostgreSQL without modifying `branch_postal_areas`.
- **API Gateway & Organization Service Contracts**:
  - Expose all new endpoints behind the existing API Gateway `/api/v1/organization/**` (`StripPrefix=3`) route with dual controller mappings:
    - Location queries (authenticated / read-accessible): `GET /locations/provinces`, `GET /locations/districts?provinceId=`, `GET /locations/ds-divisions?districtId=`, `GET /locations/gn-divisions?dsDivisionId=`, `GET /locations/postal-areas?provinceId=&districtId=&dsDivisionId=&gnDivisionId=&search=`.
    - Branch & coverage endpoints: extend `POST /branches` (accepting `postalAreaIds` transactionally), extend `PATCH /branches/{id}` (blocking `ACTIVE` transition when zero active postal areas exist), add `GET /branches/{id}/postal-areas`, and add `PUT /branches/{id}/postal-areas` (transactional set-sync that deactivates removed rows, preserves unchanged active rows, inserts new rows, rejects cross-branch collisions with HTTP `409 Conflict`, and rejects removing the last active area of an `ACTIVE` branch).
  - Enforce `ADMIN` / `HEAD_OFFICE_ADMIN` RBAC on all branch creation and postal-area coverage mutations in both Spring Security configuration and method/controller guards.
- **Order Service Postal-Code-First Branch Resolution (`ADR-0002`)**:
  - Update `BranchResolutionController` (`POST /branches/resolve-route` and `POST /branches/resolve`) and `BranchResolutionService` to resolve active branches strictly by `pickupPostalCode` and `dropoffPostalCode` against active `branch_postal_areas` and active `branches`, returning HTTP `422 Unprocessable Entity` (`UnsupportedServiceAreaException`) if either postal area is unknown, inactive, or unassigned. Branch `latitude`/`longitude` remain used for `interBranchDistanceKm`.
  - Add `pickupPostalCode` and `dropoffPostalCode` to `OrderQuoteRequest`, `RouteBranchResolutionRequest`, and the Order Service client/service flows so both live quotes and order creation resolve branches identically.
- **Frontend UI & Design System**:
  - Extend the Organization Admin branch creation, edit, and details pages using SwiftDrop's existing `.org-*` CSS design system (no Tailwind installation).
  - Implement searchable cascading dropdowns for Administrative Divisions, a searchable/filterable multi-select Postal Area picker, a compact removable table/tag list of selected Postal Areas (showing postal code, area name, district, province), auto-suggestion of the branch's physical postal code with a non-blocking removal warning, and loading/empty/error/conflict states.
  - Update the customer/merchant booking page (`/book`) to capture and validate pickup and drop-off Sri Lankan postal codes for live quotes and order submission, displaying clear 422 unsupported-service-area feedback.

## Testing Decisions

Good tests verify external HTTP/UI/CLI behavior, database constraints, and cross-service contracts rather than internal helper implementation details:

- **Organization Service (Controller MockMvc + Service/Repository Integration Tests)**:
  - Prior art: existing `BranchControllerTest`, `BranchResolutionControllerTest`, `BranchServiceTest`, and `BranchResolutionServiceTest`.
  - Test cascading location query endpoints, transactional branch creation with postal areas, activation guard (0 postal areas rejected), `409 Conflict` on duplicate active postal-area assignment, `PUT /branches/{id}/postal-areas` historical deactivation and re-assignment, RBAC `403 Forbidden` for `BRANCH_MANAGER` / non-admin roles, and `422` on unassigned/inactive postal codes in `resolve-route`.
- **Order Service (Client, Service, and End-to-End Flow Tests)**:
  - Prior art: existing `OrderEndToEndAndExceptionTest`, `OrderControllerTest`, `OrderServiceTest`, and `RestOrganizationServiceClientTest`.
  - Test `POST /quote` and `POST /orders` sending `pickupPostalCode` / `dropoffPostalCode` to `resolve-route`, persisting resolved origin/destination branch IDs, and propagating `422` unsupported-service-area responses without silently selecting a branch.
- **Dataset Import Pipeline (ETL Unit/Validation Tests)**:
  - Test normalization, duplicate/conflict detection, rejection of unverified/malformed postal codes, and idempotent re-import preserving existing `branch_postal_areas`.
- **Frontend Verification**:
  - Verify TypeScript compilation and Next.js production build cleanly, plus end-to-end verification of branch creation, postal-area conflict/validation handling, and booking quote/order postal-code resolution.

## Out of Scope

- Replacing or removing legacy `service_areas` tables, endpoints, or the existing `ServiceAreaOverview` dashboard widget.
- Adding a Branch Manager selection dropdown backed by cross-service calls to Identity Service (branch manager assignment remains in Identity Service user management).
- Overriding automatically resolved branches in Dispatcher workflows or changing delivery pricing formulas.
- Live runtime calls from backend services to external geographical APIs (`lanka-data-layer`, GitHub, or Sri Lanka Post) during customer order creation.

## Further Notes

- Domain terms (**Administrative Division**, **Postal Area**, **Branch Coverage**) are recorded in `GLOSSARY.md`.
- The postal-code-first exclusive coverage decision is recorded in `docs/adr/0002-postal-area-exclusive-branch-coverage.md`.
