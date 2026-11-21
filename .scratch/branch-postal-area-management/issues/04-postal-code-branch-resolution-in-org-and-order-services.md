# 04: Postal-Code-First Branch Resolution in Organization & Order Services

**What to build:** Deterministic postal-code-first **Branch Coverage** resolution across Organization Service and Order Service (`ADR-0002`): update `POST /branches/resolve-route` and `POST /branches/resolve` in Organization Service to resolve active branches strictly from `pickupPostalCode` and `dropoffPostalCode` via active `branch_postal_areas` (returning `422 Unprocessable Entity` when unknown, inactive, or unassigned, while retaining branch coordinates for `interBranchDistanceKm`), and update Order Service quotation and order creation (`OrderQuoteRequest`, `CreateOrderRequest`, `RestOrganizationServiceClient`, and `OrderService`) to supply and persist resolved origin and destination branches by postal code.

**Blocked by:** 02: Transactional Branch Creation with Exclusive Postal Area Assignment

**Status:** ready-for-agent

- [ ] `POST /branches/resolve-route` and `POST /branches/resolve` resolve active branches strictly by postal code against active `postal_areas` and active `branch_postal_areas` belonging to `ACTIVE` branches.
- [ ] Unknown, inactive, or unassigned pickup or destination postal codes return HTTP `422 Unprocessable Entity` (`UnsupportedServiceAreaException`) with `locationType` (`PICKUP` or `DESTINATION`) and never silently fall back to a random or Haversine branch.
- [ ] Inter-branch distance (`interBranchDistanceKm`) continues to be computed from the resolved branches' coordinates.
- [ ] Order Service `POST /quote` and `POST /orders` pass `pickupPostalCode` and `dropoffPostalCode` to Organization Service, store resolved origin/destination branch IDs, codes, and names on the order, and propagate `422` unsupported-service-area errors cleanly.
- [ ] Organization Service and Order Service MockMvc/integration tests verify valid postal-code routing and `422` error propagation.
