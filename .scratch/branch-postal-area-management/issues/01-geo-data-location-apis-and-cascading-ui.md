# 01: Sri Lankan Geographical Reference Data, Location APIs & Cascading Selection UI

**What to build:** End-to-end Sri Lankan geographical reference pipeline and cascading location selection: Flyway schema for Administrative Divisions (`provinces`, `districts`, `ds_divisions`, `gn_divisions`) and `Postal Area` (`postal_areas`), a repeatable Python ETL & validation script (normalizing Open Admin Data and postal datasets against Sri Lanka Post references and emitting a validation report), an idempotent Spring Boot `geo-import` runner, Organization Service location query endpoints (`provinces`, `districts`, `ds-divisions`, `gn-divisions`, and searchable/filterable `postal-areas`) behind the API Gateway, and cascading searchable geographical dropdowns with auto-populated coordinates on the Branch Creation UI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Flyway migration creates `provinces`, `districts`, `ds_divisions`, `gn_divisions`, and `postal_areas` (with unique 5-digit `postal_code`, `is_active`, and source attribution columns) without embedding bulk data in schema migrations.
- [ ] Python ETL script normalizes divisions and postal codes, rejects unverified or conflicting postal codes, outputs a curated versioned dataset bundle and an import validation report (`imported`, `rejected`, `conflicts`), and passes unit/validation tests.
- [ ] Spring Boot `geo-import` runner idempotently upserts geographical reference data into PostgreSQL and preserves any existing branch coverage data on re-runs.
- [ ] Location query endpoints return filtered Provinces, Districts, DS Divisions, GN Divisions, and Postal Areas (supporting province, district, DS division, GN division, and text/code search) via the API Gateway and pass MockMvc tests.
- [ ] Branch Creation UI renders cascading searchable dropdowns (`Province -> District -> DS Division`) using live location APIs and auto-populates branch latitude/longitude from the selected location (editable).
