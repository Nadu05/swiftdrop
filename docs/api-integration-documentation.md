# SwiftDrop — API Integration Documentation

**Document:** `docs/api-integration-documentation.md`  
**Gateway Base URL:** `http://localhost:8080`  
**Service Ports:** Gateway (`8080`), Identity (`8081`), Organization (`8082`), Order (`8083`), Dispatch (`8084`), Notification (`8085`)

---

## 1. Synchronous Architecture & Cross-Service Security

### 1.1 API Gateway Routing (`api-gateway`)
All browser and client traffic enters through `api-gateway` (`api-gateway/src/main/resources/application.yml`), which forwards `Cookie` / `Authorization` headers and applies prefix stripping before dispatching downstream:

| Gateway Path Predicate | Target Service | Path Rewrite Filter |
|---|---|---|
| `/api/v1/auth/**` | `identity-service:8081` | `StripPrefix=2` (`/auth/**`) |
| `/api/v1/users/**` | `identity-service:8081` | `StripPrefix=2` (`/users/**`) |
| `/api/v1/admin/**` | `identity-service:8081` | `StripPrefix=2` (`/admin/**`) |
| `/api/v1/identity/**` | `identity-service:8081` | `StripPrefix=3` (`/**`) |
| `/api/v1/organization/**` | `organization-service:8082` | `StripPrefix=3` (`/**`) |
| `/api/v1/orders/**` | `order-service:8083` | `StripPrefix=3` (`/**`) |
| `/api/v1/dispatch/**` | `dispatch-service:8084` | `StripPrefix=3` (`/**`) |
| `/api/v1/notifications/**` | `notification-service:8085` | `StripPrefix=3` (`/**`) |
| `/services/{identity,organization,orders,dispatch,notifications}/health` | Respective downstream service | `RewritePath -> /health` |

All backend controllers behind `StripPrefix=3` accept both direct full paths and gateway-stripped paths (for example `@RequestMapping({"/api/v1/dispatch", ""})` on `TransferAndExceptionController` and `@RequestMapping({"/api/v1/notifications", ""})` on `NotificationController`).

### 1.2 Unified JWT Verification Across Services
- **Token Issuer:** `identity-service` (`JwtService`) mints signed JWT tokens delivered either in the `sd_access_token` HttpOnly cookie or `Authorization: Bearer <token>`.
- **Aligned Verification Key Derivation:** `OrganizationJwtService`, `OrderJwtService`, `DispatchJwtService`, and `NotificationJwtService` share identical HMAC signing key derivation (`Decoders.BASE64.decode(secret)` with UTF-8 `SHA-256` fallback when non-Base64 or `< 32` bytes) and aligned default `app.jwt.secret` fallback values matching `identity-service`.

### 1.3 Correlation ID Propagation (`X-Correlation-Id`)
- `CorrelationIdGlobalFilter` in `api-gateway` generates or forwards `X-Correlation-Id`, adds it downstream, exposes it in CORS `exposed-headers`, and writes it back on HTTP responses.
- Each microservice configures `CorrelationIdFilter` + `CorrelationIdHolder` (populating SLF4J MDC `[corr=%X{correlationId:-none}]` in `application.yml`).
- Service-to-service synchronous HTTP clients (`RestOrganizationServiceClient` in `order-service` and `RestOrderServiceClient` in `dispatch-service`) propagate `X-Correlation-Id` headers across internal calls.

---

## 2. Service-to-Service REST Integration Calls

1. **`order-service` -> `organization-service` (`RestOrganizationServiceClient`):**
   - `POST /api/v1/branches/resolve-route` (or configured organization base URL): Resolves both origin branch (pickup coordinates) and destination branch (drop-off coordinates), validates active branch and service area coverage, and returns `RouteBranchResolutionDto`.
2. **`dispatch-service` -> `order-service` (`RestOrderServiceClient`):**
   - `GET /api/v1/orders/{idOrTracking}`: Fetches authoritative `OrderSummaryDto` (with short-lived internal service JWT minted by `DispatchJwtService`).
   - `PATCH /api/v1/orders/{id}/status` and branch drop-off notifications (`notifyBranchDropoff`): Synchronizes lifecycle transitions (`PICKUP_ASSIGNED`, `PICKED_UP`, `AT_ORIGIN_BRANCH`, `IN_TRANSIT_INTER_BRANCH`, `AT_DESTINATION_BRANCH`, `OUT_FOR_DELIVERY`, `DELIVERY_FAILED`, `DELIVERED`, `RETURN_TO_SENDER`, `RETURNED_TO_SENDER`) in `order-service`.

---

## 3. REST Endpoint Catalog by Microservice

### 3.1 Identity Service (`services/identity-service` — `:8081`)
| Controller | Method & Path (Service / Gateway-Stripped) | Purpose |
|---|---|---|
| `AuthController` (`/api/v1/auth`, `/auth`, `""`) | `POST /register`, `POST /login`, `POST /google`, `POST /refresh`, `GET /me`, `POST /logout`, `POST /change-password`, `POST /forgot-password`, `POST /reset-password`, `POST /verify-email`, `POST /resend-verification` | Registration, session auth cookies, token refresh, profile password flows |
| `UserController` (`/api/v1/users`, `/users`) | `GET /me`, `PUT /me`, `GET /me/account`, `DELETE /me`, `GET /me/email-verification` | Self-service user profile & deactivation |
| `AdminController` (`/api/v1/admin`, `/admin`) | `GET /stats`, `GET/POST/PUT /users`, `PATCH /users/{userId}/status`, `POST /users/{userId}/activate`, `POST /users/{userId}/suspend`, `GET /roles`, `GET /roles/{roleId}`, `GET /roles/{roleId}/users`, `POST/DELETE /users/{userId}/roles...` | Head Office RBAC & account administration |
| `HealthController` | `GET /health` | Service readiness/health check |

### 3.2 Organization Service (`services/organization-service` — `:8082`)
| Controller | Method & Path | Purpose |
|---|---|---|
| `BranchController` (`/api/v1/branches`, `/branches`) | `POST /`, `GET /`, `GET /{id}`, `PATCH /{id}`, `GET /{branchId}/service-areas` | Branch lifecycle & assigned service area queries |
| `BranchResolutionController` (`/api/v1/branches`, `/branches`) | `POST /resolve`, `POST /resolve-route` (and `/resolve/route`) | Single-coordinate & dual-coordinate pickup/destination Haversine branch resolution |
| `ServiceAreaController` (`/api/v1/service-areas`, `/service-areas`) | `POST /`, `GET /`, `GET /{id}`, `PATCH /{id}` | Geographic coverage zone management |
| `MerchantApplicationController` (`/api/v1/merchants/applications`, `/merchants/applications`) | `POST /`, `GET /`, `GET /approved`, `GET /summary`, `GET /my`, `GET /{id}`, `POST /{id}/approve`, `POST /{id}/reject` | Merchant onboarding application workflow & admin review |
| `HealthController` | `GET /health` | Service health check |

### 3.3 Order Service (`services/order-service` — `:8083`)
| Controller | Method & Path (supports `/api/v1/orders...`, `/orders...`, and stripped root paths) | Purpose |
|---|---|---|
| `OrderController` | `POST /quote` | Delivery pricing quotation with origin & destination branch resolution |
| `OrderController` | `POST /` | Order creation (`PREPAID` or `COD`, `COURIER_PICKUP` or `BRANCH_DROPOFF`, Customer or Merchant) |
| `OrderController` | `GET /`, `GET /{idOrTracking}` | Authenticated customer/merchant/operational order queries |
| `OrderController` | `GET /tracking/{trackingNumber}` | Public milestone tracking lookup (no sensitive PII) |
| `OrderController` | `PATCH /{idOrTracking}/status` | Operational status transition validation against 14-state machine |
| `OrderController` | `POST /{idOrTracking}/branch-dropoff`, `POST /{idOrTracking}/payment/confirm`, `POST /{idOrTracking}/cancel` | Branch drop-off intake, verified prepaid payment confirmation, and cancellation |
| `HealthController` | `GET /health` | Service health check |

### 3.4 Dispatch Service (`services/dispatch-service` — `:8084`)
| Controller | Method & Path (supports `/api/v1/dispatch...` and gateway-stripped paths) | Purpose |
|---|---|---|
| `DispatchController` | `POST /pickup-tasks`, `GET /pickup-tasks`, `POST /branch-dropoff`, `POST /delivery-jobs`, `GET /deliveries/active`, `GET /deliveries/unassigned` | Pickup task queue, branch drop-off intake, unassigned/active delivery queues |
| `DispatchController` | `GET /couriers`, `GET /couriers/availability`, `GET /couriers/{courierId}/workload`, `GET /couriers/me`, `PATCH /couriers/me/availability`, `GET /couriers/me/assignments` | Courier fleet workload and courier self-service workspace |
| `DispatchController` | `POST /couriers/me/assignments/{id}/accept`, `/pickup`, `/deliver`, `/fail` | Courier job execution, POD capture, and failed attempt recording (max 3 attempts) |
| `DispatchController` | `POST /assignments`, `GET /assignments`, `GET /assignments/{id}`, `GET /assignments/{id}/history`, `PATCH /assignments/{id}`, `POST /assignments/{id}/reassign`, `/accept`, `/pickup`, `/deliver`, `/fail` | Dispatcher assignment, reassignment, and status operations |
| `DispatchController` | `GET /exceptions`, `POST /exceptions/{id}/decision`, `PATCH /exceptions/{id}` | Dispatcher review and exception resolution after 3 failed attempts |
| `TransferAndExceptionController` (`/api/v1/dispatch`, `""`) | `GET /transfers/ready-parcels`, `POST/GET /transfers/manifests`, `GET /transfers/manifests/{manifestIdOrCode}`, `POST/DELETE /transfers/manifests/{manifestIdOrCode}/parcels...`, `POST .../assign-courier`, `/depart`, `/receive`, `/complete`, `/cancel` | Inter-branch transfer manifest workflow for regular couriers |
| `TransferAndExceptionController` | `GET /custody`, `GET /custody/parcel/{parcelKey}`, `POST /exceptions`, `PATCH /exceptions/{exceptionId}/status` | End-to-end parcel custody chain and operational exception tracking |
| `TransferAndExceptionController` | `POST /returns`, `GET /returns`, `GET /returns/{returnIdOrCode}`, `POST .../assign-courier`, `/movement`, `/confirm` | Return-to-sender lifecycle |
| `HealthController` | `GET /health` | Service health check |

### 3.5 Notification Service (`services/notification-service` — `:8085`)
| Controller | Method & Path (`/api/v1/notifications`, `""`) | Purpose |
|---|---|---|
| `NotificationController` | `GET /`, `GET /me` | Role-scoped and user-scoped notification history queries |
| `NotificationController` | `GET /tracking/{trackingNumber}` | Public milestone notifications with masked email addresses |
| `NotificationController` | `PATCH /{idOrCode}/read` | Mark notification as read |
| `NotificationController` | `POST /retry-failed` | Admin/Dispatcher retry trigger for persisted `FAILED` deliveries |
| `HealthController` | `GET /health` | Service health check |

---

## 4. Frontend API Clients (`frontend/src/api/services/`)
- `auth.api.ts`, `user.api.ts`, `password.api.ts`, `admin.api.ts` (Identity & Admin UI)
- `organization.api.ts` (Branch, Service Area, Dual-Coordinate Route Resolution & Merchant Onboarding)
- `orders.api.ts` (Quotation, Order Creation, Bookings History & Public Tracking)
- `dispatch.api.ts` & `courier.api.ts` (Dispatcher Operations, Transfers, Exceptions, Returns & Courier Portal)
- `notifications.api.ts` (Notifications History, Public Milestone Feed, Read State & Admin Retry)

