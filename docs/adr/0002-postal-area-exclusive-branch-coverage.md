---
status: accepted
---

# Postal-area exclusive branch coverage for Order routing

## Context

`organization-service` previously modeled branch coverage in `service_areas` using circular Haversine radius zones (`center_latitude`, `center_longitude`, `max_radius_km`), and `order-service` resolved origin and destination branches purely by coordinates. This allowed overlapping zones, relied on approximate coordinate matching, and did not reflect Sri Lanka's official administrative divisions or postal code boundaries.

## Decision

`organization-service` introduces normalized Sri Lankan geographical reference tables (`provinces`, `districts`, `ds_divisions`, `gn_divisions`, `postal_areas` with one canonical row per unique 5-digit `postal_code`) and `branch_postal_areas` with a partial unique index (`WHERE is_active = true`) enforcing exclusive active coverage per `Postal Area` while retaining historical assignment records. `POST /api/v1/branches/resolve-route` (and `order-service` quotation and order creation) resolves origin and destination branches strictly by `pickupPostalCode` and `dropoffPostalCode`, returning `422 Unprocessable Entity` (`UnsupportedServiceAreaException`) when a postal area has no active assigned branch. Branch `latitude` and `longitude` remain on `branches` for inter-branch distance pricing.

## Considered Options

- **Postal-code-first with Haversine `service_areas` fallback**: rejected because silent coordinate fallback would mask unassigned postal areas instead of surfacing coverage gaps as explicit `422` errors.
- **Drop `service_areas` immediately**: rejected to preserve backward compatibility for existing read endpoints and dashboard widgets while `branch_postal_areas` becomes the authoritative routing model.

## Consequences

- `OrderQuoteRequest`, `CreateOrderRequest`, `RouteBranchResolutionRequest`, and `/book` must supply valid `pickupPostalCode` and `dropoffPostalCode` values.
- Existing `service_areas` records remain untouched as legacy data and are no longer authoritative for order routing.
- An operational (`ACTIVE`) branch must have at least one active assigned `Postal Area` in `branch_postal_areas`.
