# SwiftDrop — Existing Implementation Status Audit

**Document:** `docs/implementation/IMPLEMENTATION_STATUS.md`  
**Audit Date:** 2026-11-13  
**Branch Audited:** `dev`  

---

## 1. Executive Summary & Classification Matrix

Every business capability defined in `agents/SwiftDrop_Business_Process.md` and `agents/SwiftDrop_Finalized_Business_Decisions.md` has been audited against the actual repository code and classified into one of five states:

- **Fully Implemented:** Backend API, database schema, business logic, and frontend UI are complete and integrated.
- **Partially Implemented:** Either only a subset of the domain exists on the backend/frontend, or backend and frontend are not yet fully wired for all operations.
- **Frontend Mock Only:** Rich UI components and client state exist in Next.js, but data is served from in-memory mock stores or fallback fixtures.
- **Backend Scaffold Only:** Microservice infrastructure (Spring Boot, Flyway `V1__create_test_items.sql`, RabbitMQ config, Actuator health) exists, but domain entities/APIs are limited to `TestItem`.
- **Missing:** Neither frontend UI nor backend domain logic exists yet.

| Business Module / Capability | Owning Service | Classification | Summary of Evidence |
|---|---|---|---|
| **1. Authentication & Session Management** | Identity Service (`:8081`) | **Fully Implemented** | `AuthController`, `AuthService`, JWT `HttpOnly` cookies, SHA-256 refresh token rotation, Google OAuth GIS, `/login`, `/register`. |
| **2. User Profile, Password & Lifecycle** | Identity Service (`:8081`) | **Fully Implemented** | `UserController`, `UserService`, `PasswordService`, `/profile`, `/settings/account`, `/settings/security`, `/forgot-password`, `/reset-password`, `/verify-email`. |
| **3. Head Office RBAC & User Administration** | Identity Service (`:8081`) | **Fully Implemented** | `AdminController`, `AdminService`, last-active-admin protection, JPA specification filtering, `/admin`, `/admin/users`, `/admin/roles`. |
| **4. Branch CRUD & Organization Dashboard** | Organization Service (`:8082`) | **Fully Implemented** | `BranchController`, `BranchService`, `V2__create_branches.sql`, `organization.api.ts`, `/organization`, `/organization/branches/**`. |
| **5. Branch Service Areas Configuration** | Organization Service (`:8082`) | **Partially Implemented** | Backend CRUD complete (`ServiceAreaController`, `V3__create_service_areas.sql`). Frontend reads service areas on branch views, while zone/pricing editing in `/dispatcher/zones-pricing` uses mocks. |
| **6. Geographic Branch Resolution** | Organization Service (`:8082`) | **Partially Implemented** | `BranchResolutionController` (`POST /branches/resolve`) resolves single coordinate (pickup) via Haversine distance. Dual origin + destination resolution for order booking is not yet wired. |
| **7. Merchant Registration & Approval** | Organization Service (`:8082`) | **Frontend Mock Only** (Misplaced in Dispatcher UI) | Mock UI exists at `/dispatcher/merchants` and `/dispatcher/merchant-approvals/[applicationId]` backed by `merchantApprovalApi.ts`. Missing from `organization-service` backend and Head Office Admin portal. |
| **8. Customer Booking & Fee Quotation** | Order Service (`:8083`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/book`, `/book/confirmation`, `orders.api.ts` (`POST /api/v1/orders/quote`, `POST /api/v1/orders`) exist with local fallback. Backend `order-service` only has `TestItem`. |
| **9. Customer Order History, Details & Receipts** | Order Service (`:8083`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/customer/dashboard`, `/bookings`, `/bookings/[id]`, `/bookings/[id]/receipt` exist with `DEFAULT_CUSTOMER_ORDERS` fallback. Backend `order-service` only has `TestItem`. |
| **10. Public Parcel Tracking** | Order Service (`:8083`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/tracking` and `getPublicTracking()` in `orders.api.ts` exist. Backend `order-service` has no tracking controller or schema yet. |
| **11. Payment & COD Financial Tracking (BD-01)** | Order Service (`:8083`) / Dispatch (`:8084`) | **Missing** | Confirmed in `BD-01` (Prepaid & COD separation), but neither booking forms nor backend schemas currently model payment records or COD amounts. |
| **12. Pickup Method Selection: Courier vs Branch Drop-off (BD-04/05)** | Order Service (`:8083`) / Dispatch (`:8084`) | **Missing** | Confirmed in `BD-04` and `BD-05`, but current booking schema (`order.schema.ts`) only captures pickup address without pickup method selection (`COURIER_PICKUP` vs `BRANCH_DROPOFF`). |
| **13. Dispatcher Unassigned Queue & Courier Allocation** | Dispatch Service (`:8084`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/dispatcher/deliveries`, `/dispatcher/assignments`, `assignmentService.ts`, `assignmentsApi.ts` exist with `NEXT_PUBLIC_DISPATCH_API_MODE` switch. Backend `dispatch-service` only has `TestItem`. |
| **14. Dispatcher Fleet & Courier Workload Monitoring** | Dispatch Service (`:8084`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/dispatcher/couriers`, `/dispatcher/active-deliveries`, `couriersApi.ts`, `activeDeliveriesApi.ts` run on in-memory mocks. Backend `dispatch-service` only has `TestItem`. |
| **15. Courier Portal: Availability, Job Acceptance & Pickup** | Dispatch Service (`:8084`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `/courier`, `/courier/deliveries`, `/courier/active`, `courier.api.ts`, `use-courier.ts` exist with `NEXT_PUBLIC_DISPATCH_API_MODE` toggle. Backend `dispatch-service` only has `TestItem`. |
| **16. Proof of Delivery (POD) & Failed Attempts (BD-02, BD-08)** | Dispatch Service (`:8084`) | **Frontend Mock Only** / **Backend Scaffold Only** | Frontend `courier.api.ts` (`completeDelivery`, `reportFailedDelivery`) and `courier.types.ts` model POD and failure reasons. 3-attempt escalation (`BD-02`/`BD-07`) to `Pending Dispatcher Decision` is not yet enforced on backend. |
| **17. Inter-Branch Transfer Manifests (BD-03)** | Dispatch Service (`:8084`) | **Missing** | Confirmed in `BD-03` (regular couriers handle inter-branch transfers via manifests), but no entity, API, or UI exists for creating, dispatching, or receiving transfer manifests. |
| **18. Event-Driven Notifications & Webhooks** | Notification Service (`:8085`) | **Backend Scaffold Only** | `identity-service` defines `IdentityEventPublisher` (logging stub). `notification-service` has `RabbitMQConfig` (`swiftdrop.events`) and `TestItem`, but no domain event listeners, email/SMS senders, or webhook processors. |

---

## 2. Backend Microservices Detailed Audit

### 2.1 API Gateway (`api-gateway` — Port `8080`)
- **Status:** **Fully Implemented** (Routing & CORS)
- **Configuration File:** `api-gateway/src/main/resources/application.yml`
- **Configured Routes:**
  - `/api/v1/auth/**` &rarr; `identity-service:8081` (`StripPrefix=2` &rarr; `/auth/**`)
  - `/api/v1/users/**` &rarr; `identity-service:8081` (`StripPrefix=2` &rarr; `/users/**`)
  - `/api/v1/admin/**` &rarr; `identity-service:8081` (`StripPrefix=2` &rarr; `/admin/**`)
  - `/api/v1/identity/**` &rarr; `identity-service:8081` (`StripPrefix=3` &rarr; `/**`)
  - `/api/v1/organization/**` &rarr; `organization-service:8082` (`StripPrefix=3` &rarr; `/**`)
  - `/api/v1/orders/**` &rarr; `order-service:8083` (`StripPrefix=3` &rarr; `/**`)
  - `/api/v1/dispatch/**` &rarr; `dispatch-service:8084` (`StripPrefix=3` &rarr; `/**`)
  - `/api/v1/notifications/**` &rarr; `notification-service:8085` (`StripPrefix=3` &rarr; `/**`)
  - `/services/{identity,organization,orders,dispatch,notifications}/health` &rarr; `/health` on each respective service.
- **Note on Public Tracking Route:** Frontend `orders.api.ts` calls `/api/v1/tracking/{trackingNumber}` first, then falls back to `/api/v1/orders/tracking/{trackingNumber}`. Adding a dedicated `/api/v1/tracking/**` route in `api-gateway` (or standardizing on `/api/v1/orders/tracking/**`) will eliminate the extra 404 round-trip.

---

### 2.2 Identity Service (`services/identity-service` — Port `8081`)
- **Status:** **Fully Implemented** (80/80 unit & controller tests passing)
- **Database:** `swiftdrop_identity` (Neon PostgreSQL)
- **Flyway Migrations (Must be preserved):**
  - `services/identity-service/src/main/resources/db/migration/V1__create_test_items.sql`
  - `services/identity-service/src/main/resources/db/migration/V2__create_users_roles.sql` (`users`, `roles`, `user_roles`, `refresh_tokens`)
  - `services/identity-service/src/main/resources/db/migration/V3__seed_roles.sql` (`CUSTOMER`, `MERCHANT`, `COURIER`, `DISPATCHER`, `ADMIN`)
  - `services/identity-service/src/main/resources/db/migration/V4__convert_enums_to_varchar.sql`
  - `services/identity-service/src/main/resources/db/migration/V5__user_profile_lifecycle_tokens.sql` (`email_verified`, `deactivated_at`, `password_changed_at`, `password_reset_tokens`, `email_verification_tokens`)
- **Key Classes:**
  - Controllers:
    - `services/identity-service/src/main/java/com/swiftdrop/identity/controller/AuthController.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/controller/UserController.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/controller/AdminController.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/controller/HealthController.java`
  - Services:
    - `services/identity-service/src/main/java/com/swiftdrop/identity/service/AuthService.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/service/UserService.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/service/PasswordService.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/service/AdminService.java`
  - Security:
    - `services/identity-service/src/main/java/com/swiftdrop/identity/config/SecurityConfig.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/security/JwtService.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/security/JwtAuthenticationFilter.java`
    - `services/identity-service/src/main/java/com/swiftdrop/identity/security/CustomUserDetailsService.java`

---

### 2.3 Organization Service (`services/organization-service` — Port `8082`)
- **Status:** **Partially Implemented** (Branches, Service Areas, Single-Coordinate Branch Resolution implemented; Security config, Dual-Coordinate Resolution, and Merchant Onboarding/Approval missing)
- **Database:** `swiftdrop_organization` (Neon PostgreSQL)
- **Flyway Migrations (Must be preserved):**
  - `services/organization-service/src/main/resources/db/migration/V1__create_test_items.sql`
  - `services/organization-service/src/main/resources/db/migration/V2__create_branches.sql` (`branches` table)
  - `services/organization-service/src/main/resources/db/migration/V3__create_service_areas.sql` (`service_areas` table with FK to `branches(id)`)
- **Key Classes:**
  - Controllers:
    - `services/organization-service/src/main/java/com/swiftdrop/organization/controller/BranchController.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/controller/ServiceAreaController.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/controller/BranchResolutionController.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/controller/HealthController.java`
  - Services & Utils:
    - `services/organization-service/src/main/java/com/swiftdrop/organization/service/BranchService.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/service/ServiceAreaService.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/service/BranchResolutionService.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/util/HaversineDistanceCalculator.java`
  - Entities:
    - `services/organization-service/src/main/java/com/swiftdrop/organization/entity/Branch.java`
    - `services/organization-service/src/main/java/com/swiftdrop/organization/entity/ServiceArea.java`

---

### 2.4 Order Service (`services/order-service` — Port `8083`)
- **Status:** **Backend Scaffold Only**
- **Database:** `swiftdrop_order` (Neon PostgreSQL)
- **Flyway Migrations (Must be preserved):**
  - `services/order-service/src/main/resources/db/migration/V1__create_test_items.sql`
- **Existing Classes:**
  - `services/order-service/src/main/java/com/swiftdrop/order/OrderServiceApplication.java`
  - `services/order-service/src/main/java/com/swiftdrop/order/config/RabbitMQConfig.java` (`swiftdrop.events`, `order.events.queue`, `order.#`)
  - `services/order-service/src/main/java/com/swiftdrop/order/config/OpenApiConfig.java`
  - `services/order-service/src/main/java/com/swiftdrop/order/controller/HealthController.java`
  - `services/order-service/src/main/java/com/swiftdrop/order/controller/TestItemController.java`
  - `services/order-service/src/main/java/com/swiftdrop/order/exception/GlobalExceptionHandler.java`
- **Missing Domain Components:**
  - Entities & Migrations (`V2__...`) for `orders`/`parcels`, `order_status_history` (immutable lifecycle log), `pricing_rules`, `order_payments`.
  - Controllers & Services for Quotations, Order Creation (Customer & Merchant), Order Listing, Order Details, Status Transitions, Cancellation, and Public Parcel Tracking.

---

### 2.5 Dispatch Service (`services/dispatch-service` — Port `8084`)
- **Status:** **Backend Scaffold Only**
- **Database:** `swiftdrop_dispatch` (Neon PostgreSQL)
- **Flyway Migrations (Must be preserved):**
  - `services/dispatch-service/src/main/resources/db/migration/V1__create_test_items.sql`
- **Existing Classes:**
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/DispatchServiceApplication.java`
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/config/RabbitMQConfig.java` (`swiftdrop.events`, `dispatch.events.queue`, `dispatch.#`)
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/config/OpenApiConfig.java`
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/controller/HealthController.java`
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/controller/TestItemController.java`
  - `services/dispatch-service/src/main/java/com/swiftdrop/dispatch/exception/GlobalExceptionHandler.java`
- **Missing Domain Components:**
  - Entities & Migrations (`V2__...`) for `courier_profiles`, `dispatch_assignments` (pickup, inter-branch transfer, last-mile), `delivery_attempts` (up to 3 attempts per `BD-02`), `proof_of_delivery` (`BD-08`), `dispatcher_decisions` (`BD-07`), and `transfer_manifests` / `transfer_manifest_items` (`BD-03`).
  - Controllers & Services for Dispatcher Queue, Courier Assignment/Reassignment, Courier Self-Service (`couriers/me/**`), Attempt/POD Recording, Exception Decisions, and Inter-Branch Transfer Manifests.

---

### 2.6 Notification Service (`services/notification-service` — Port `8085`)
- **Status:** **Backend Scaffold Only**
- **Database:** `swiftdrop_notification` (Neon PostgreSQL)
- **Flyway Migrations (Must be preserved):**
  - `services/notification-service/src/main/resources/db/migration/V1__create_test_items.sql`
- **Existing Classes:**
  - `services/notification-service/src/main/java/com/swiftdrop/notification/NotificationServiceApplication.java`
  - `services/notification-service/src/main/java/com/swiftdrop/notification/config/RabbitMQConfig.java` (`swiftdrop.events`, `notification.events.queue`, `notification.#`)
  - `services/notification-service/src/main/java/com/swiftdrop/notification/controller/HealthController.java`
  - `services/notification-service/src/main/java/com/swiftdrop/notification/controller/TestItemController.java`
- **Missing Domain Components:**
  - RabbitMQ bindings to listen to `order.#`, `dispatch.#`, `organization.#`, and `identity.#` events.
  - Entities & Migrations (`V2__...`) for `notifications`, `notification_deliveries`, `merchant_webhooks`.
  - Event listeners & notification dispatchers (Email/In-App/Webhooks).

---

## 3. Frontend Application Detailed Audit (`frontend/src`)

### 3.1 Core Infrastructure & API Layer
| File Path | Purpose | Status |
|---|---|---|
| `frontend/src/api/axios-client.ts` | Shared Axios instance (`withCredentials: true`, Bearer fallback, 401 token refresh queue) | **Fully Implemented** |
| `frontend/src/middleware.ts` | Next.js Edge route protection checking `sd_access_token` / `sd_refresh_token` | **Fully Implemented** |
| `frontend/src/store/auth.store.ts` | Zustand authentication state store | **Fully Implemented** |
| `frontend/src/app/providers.tsx` | TanStack Query `QueryClientProvider` & session bootstrapper | **Fully Implemented** |

### 3.2 Domain API Clients (`frontend/src/api/services/`)
| File Path | Target Service | Status | Notes |
|---|---|---|---|
| `frontend/src/api/services/auth.api.ts` | Identity (`:8081`) | **Fully Implemented** | Real endpoints `/api/v1/auth/*` + legacy mock helpers for demo switcher. |
| `frontend/src/api/services/user.api.ts` | Identity (`:8081`) | **Fully Implemented** | Real endpoints `/api/v1/users/me/*`. |
| `frontend/src/api/services/password.api.ts` | Identity (`:8081`) | **Fully Implemented** | Real endpoints `/api/v1/auth/{change,forgot,reset}-password`. |
| `frontend/src/api/services/admin.api.ts` | Identity (`:8081`) | **Fully Implemented** | Real endpoints `/api/v1/admin/{stats,users,roles}/*`. |
| `frontend/src/api/services/organization.api.ts` | Organization (`:8082`) | **Fully Implemented** | Real endpoints `/api/v1/organization/{branches,service-areas,branches/resolve}`. |
| `frontend/src/api/services/orders.api.ts` | Order (`:8083`) | **Partially Implemented** | Calls `/api/v1/orders/{quote,orders,tracking}`, falls back to `DEFAULT_CUSTOMER_ORDERS` when 404/offline. |
| `frontend/src/api/services/courier.api.ts` | Dispatch (`:8084`) | **Partially Implemented** | Calls `/api/v1/dispatch/couriers/me/*` when `NEXT_PUBLIC_DISPATCH_API_MODE=api`; defaults to `courier.mock.ts`. |

### 3.3 Route-Level Mock Modules Requiring Backend Integration
| File Path | Portal | Current Behavior |
|---|---|---|
| `frontend/src/components/dispatcher/deliveries/deliveriesApi.ts` | Dispatcher | In-memory `UNASSIGNED_DELIVERIES_FIXTURES`. |
| `frontend/src/components/dispatcher/deliveries/assignmentService.ts` | Dispatcher | Supports `NEXT_PUBLIC_DISPATCH_API_MODE=api` (`GET /api/v1/dispatch/couriers/availability`, `POST /api/v1/dispatch/assignments`), but DTO mappers throw `not_configured` until backend DTOs are finalized. |
| `frontend/src/components/dispatcher/assignments/assignmentsApi.ts` | Dispatcher | In-memory `assignmentsMockData` (`GET /api/v1/dispatch/assignments`, `PATCH /api/v1/dispatch/assignments/{id}`). |
| `frontend/src/components/dispatcher/activeDeliveries/activeDeliveriesApi.ts` | Dispatcher | In-memory active deliveries list. |
| `frontend/src/components/dispatcher/couriers/couriersApi.ts` | Dispatcher | In-memory `couriersFleetMockData`. |
| `frontend/src/components/dispatcher/reports/reportsApi.ts` | Dispatcher | In-memory analytics & report fixtures. |
| `frontend/src/components/dispatcher/zones/zonesPricingApi.ts` | Dispatcher | Fetches real branches via `getBranches()`, but keeps zones and pricing rules in in-memory stores. |
| `frontend/src/components/dispatcher/merchant-approvals/merchantApprovalApi.ts` | Dispatcher (Misplaced; belongs to Admin/Organization) | In-memory `INITIAL_MERCHANT_APPLICATIONS`. |

### 3.4 Frontend Route Inventory (`frontend/src/app/`)
| Route Path | File Path | Status |
|---|---|---|
| `/login` | `frontend/src/app/(auth)/login/page.tsx` | **Fully Implemented** (Real Identity API + Google GIS) |
| `/register` | `frontend/src/app/(auth)/register/page.tsx` | **Fully Implemented** (Real Identity API + Google GIS) |
| `/forgot-password` | `frontend/src/app/(auth)/forgot-password/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/reset-password` | `frontend/src/app/(auth)/reset-password/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/verify-email` | `frontend/src/app/(auth)/verify-email/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/demo-login` | `frontend/src/app/demo-login/page.tsx` | **Frontend Mock Only** (Role preset switcher for dev previews) |
| `/` | `frontend/src/app/(platform)/page.tsx` | **Fully Implemented** (Architecture overview & quick links) |
| `/health` | `frontend/src/app/(platform)/health/page.tsx` | **Fully Implemented** (Live actuator checks across 5 services) |
| `/api-tester` | `frontend/src/app/(platform)/api-tester/page.tsx` | **Fully Implemented** (TestItem CRUD tester) |
| `/profile` | `frontend/src/app/(platform)/profile/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/settings/account` | `frontend/src/app/(platform)/settings/account/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/settings/security` | `frontend/src/app/(platform)/settings/security/page.tsx` | **Fully Implemented** (Real Identity API) |
| `/admin` | `frontend/src/app/(platform)/admin/page.tsx` | **Fully Implemented** (Real Identity Admin API + `AdminGuard`) |
| `/admin/users` | `frontend/src/app/(platform)/admin/users/page.tsx` | **Fully Implemented** (Real Identity Admin API + `AdminGuard`) |
| `/admin/users/[userId]` | `frontend/src/app/(platform)/admin/users/[userId]/page.tsx` | **Fully Implemented** (Real Identity Admin API + `AdminGuard`) |
| `/admin/roles` | `frontend/src/app/(platform)/admin/roles/page.tsx` | **Fully Implemented** (Real Identity Admin API + `AdminGuard`) |
| `/admin/roles/[roleId]` | `frontend/src/app/(platform)/admin/roles/[roleId]/page.tsx` | **Fully Implemented** (Real Identity Admin API + `AdminGuard`) |
| `/customers` | `frontend/src/app/(platform)/customers/page.tsx` | **Frontend Mock Only** (Customer intelligence summary) |
| `/organization` | `frontend/src/app/organization/page.tsx` | **Fully Implemented** (Real Organization API) |
| `/organization/branches` | `frontend/src/app/organization/branches/page.tsx` | **Fully Implemented** (Real Organization API) |
| `/organization/branches/create` | `frontend/src/app/organization/branches/create/page.tsx` | **Fully Implemented** (Real Organization API) |
| `/organization/branches/[id]` | `frontend/src/app/organization/branches/[id]/page.tsx` | **Fully Implemented** (Real Organization API) |
| `/organization/branches/[id]/edit` | `frontend/src/app/organization/branches/[id]/edit/page.tsx` | **Fully Implemented** (Real Organization API) |
| `/customer/dashboard` | `frontend/src/app/customer/dashboard/page.tsx` | **Frontend Mock Fallback** (Uses `orders.api.ts`) |
| `/customer/profile` | `frontend/src/app/customer/profile/page.tsx` | **Frontend Mock Fallback** (Uses `getCurrentUserProfile` + `orders.api.ts`) |
| `/book` | `frontend/src/app/book/page.tsx` | **Frontend Mock Fallback** (Calls `/api/v1/orders/quote` & `/api/v1/orders`) |
| `/book/confirmation` | `frontend/src/app/book/confirmation/page.tsx` | **Frontend Mock Fallback** |
| `/bookings` | `frontend/src/app/bookings/page.tsx` | **Frontend Mock Fallback** (Calls `getCustomerOrders()`) |
| `/bookings/[id]` | `frontend/src/app/bookings/[id]/page.tsx` | **Frontend Mock Fallback** (Calls `getOrderById()`) |
| `/bookings/[id]/receipt` | `frontend/src/app/bookings/[id]/receipt/page.tsx` | **Frontend Mock Fallback** |
| `/tracking` | `frontend/src/app/tracking/page.tsx` | **Frontend Mock Fallback** (Calls `getPublicTracking()`) |
| `/dispatcher/dashboard` | `frontend/src/app/dispatcher/dashboard/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/deliveries` | `frontend/src/app/dispatcher/deliveries/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/assignments` | `frontend/src/app/dispatcher/assignments/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/active-deliveries` | `frontend/src/app/dispatcher/active-deliveries/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/couriers` | `frontend/src/app/dispatcher/couriers/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/delivery-history` | `frontend/src/app/dispatcher/delivery-history/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/reports` | `frontend/src/app/dispatcher/reports/page.tsx` | **Frontend Mock Only** |
| `/dispatcher/zones-pricing` | `frontend/src/app/dispatcher/zones-pricing/page.tsx` | **Partially Implemented** (Real branches + mock zones/pricing) |
| `/dispatcher/merchants` | `frontend/src/app/dispatcher/merchants/page.tsx` | **Frontend Mock Only** (Misplaced; belongs to Organization/Admin) |
| `/dispatcher/merchant-approvals/[applicationId]` | `frontend/src/app/dispatcher/merchant-approvals/[applicationId]/page.tsx` | **Frontend Mock Only** (Misplaced; belongs to Organization/Admin) |
| `/courier` | `frontend/src/app/courier/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
| `/courier/deliveries` | `frontend/src/app/courier/deliveries/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
| `/courier/active` | `frontend/src/app/courier/active/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
| `/courier/history` | `frontend/src/app/courier/history/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
| `/courier/earnings` | `frontend/src/app/courier/earnings/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
| `/courier/profile` | `frontend/src/app/courier/profile/page.tsx` | **Frontend Mock Fallback** (Uses `courier.api.ts`) |
