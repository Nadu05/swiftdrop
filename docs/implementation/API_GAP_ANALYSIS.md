# SwiftDrop — API Gap Analysis

**Document:** `docs/implementation/API_GAP_ANALYSIS.md`  
**Audit Date:** 2026-11-13  
**Gateway Base URL:** `http://localhost:8080/api/v1`  

---

## 1. Existing Implemented Backend Endpoints

### 1.1 Identity Service (`services/identity-service` — Port `8081`)
Gateway routes: `/api/v1/auth/**` (`StripPrefix=2`), `/api/v1/users/**` (`StripPrefix=2`), `/api/v1/admin/**` (`StripPrefix=2`), `/api/v1/identity/**` (`StripPrefix=3`).

| Method | Gateway Path | Service Path | Controller File | Frontend Client File | Status |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `/auth/register` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `POST` | `/api/v1/auth/login` | `/auth/login` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `POST` | `/api/v1/auth/google` | `/auth/google` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `POST` | `/api/v1/auth/refresh` | `/auth/refresh` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `POST` | `/api/v1/auth/logout` | `/auth/logout` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `GET` | `/api/v1/auth/me` | `/auth/me` | `AuthController.java` | `frontend/src/api/services/auth.api.ts` | Implemented |
| `POST` | `/api/v1/auth/change-password` | `/auth/change-password` | `AuthController.java` | `frontend/src/api/services/password.api.ts` | Implemented |
| `POST` | `/api/v1/auth/forgot-password` | `/auth/forgot-password` | `AuthController.java` | `frontend/src/api/services/password.api.ts` | Implemented |
| `POST` | `/api/v1/auth/reset-password` | `/auth/reset-password` | `AuthController.java` | `frontend/src/api/services/password.api.ts` | Implemented |
| `POST` | `/api/v1/auth/verify-email/request` | `/auth/verify-email/request` | `AuthController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `POST` | `/api/v1/auth/verify-email/confirm` | `/auth/verify-email/confirm` | `AuthController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `GET` | `/api/v1/auth/verify-email/status` | `/auth/verify-email/status` | `AuthController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `GET` | `/api/v1/users/me` | `/users/me` | `UserController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `PUT` | `/api/v1/users/me` | `/users/me` | `UserController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `GET` | `/api/v1/users/me/account` | `/users/me/account` | `UserController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `DELETE` | `/api/v1/users/me` | `/users/me` | `UserController.java` | `frontend/src/api/services/user.api.ts` | Implemented |
| `GET` | `/api/v1/admin/stats` | `/admin/stats` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `GET` | `/api/v1/admin/users` | `/admin/users` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `GET` | `/api/v1/admin/users/{userId}` | `/admin/users/{userId}` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `POST` | `/api/v1/admin/users` | `/admin/users` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `PUT` | `/api/v1/admin/users/{userId}` | `/admin/users/{userId}` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `PATCH` | `/api/v1/admin/users/{userId}/status` | `/admin/users/{userId}/status` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `POST` | `/api/v1/admin/users/{userId}/activate` | `/admin/users/{userId}/activate` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `POST` | `/api/v1/admin/users/{userId}/suspend` | `/admin/users/{userId}/suspend` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `GET` | `/api/v1/admin/roles` | `/admin/roles` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `GET` | `/api/v1/admin/roles/{roleId}` | `/admin/roles/{roleId}` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `GET` | `/api/v1/admin/roles/{roleId}/users` | `/admin/roles/{roleId}/users` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `POST` | `/api/v1/admin/users/{userId}/roles` | `/admin/users/{userId}/roles` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |
| `DELETE` | `/api/v1/admin/users/{userId}/roles/{roleName}` | `/admin/users/{userId}/roles/{roleName}` | `AdminController.java` | `frontend/src/api/services/admin.api.ts` | Implemented |

---

### 1.2 Organization Service (`services/organization-service` — Port `8082`)
Gateway route: `/api/v1/organization/**` (`StripPrefix=3`).

| Method | Gateway Path | Service Path | Controller File | Frontend Client File | Status |
|---|---|---|---|---|---|
| `POST` | `/api/v1/organization/branches` | `/branches` | `BranchController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `GET` | `/api/v1/organization/branches` | `/branches` | `BranchController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `GET` | `/api/v1/organization/branches/{id}` | `/branches/{id}` | `BranchController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `PATCH` | `/api/v1/organization/branches/{id}` | `/branches/{id}` | `BranchController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `GET` | `/api/v1/organization/branches/{branchId}/service-areas` | `/branches/{branchId}/service-areas` | `BranchController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `POST` | `/api/v1/organization/service-areas` | `/service-areas` | `ServiceAreaController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `GET` | `/api/v1/organization/service-areas` | `/service-areas` | `ServiceAreaController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `GET` | `/api/v1/organization/service-areas/{id}` | `/service-areas/{id}` | `ServiceAreaController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `PATCH` | `/api/v1/organization/service-areas/{id}` | `/service-areas/{id}` | `ServiceAreaController.java` | `frontend/src/api/services/organization.api.ts` | Implemented |
| `POST` | `/api/v1/organization/branches/resolve` | `/branches/resolve` | `BranchResolutionController.java` | `frontend/src/api/services/organization.api.ts` | Implemented (Single Coordinate Only) |

---

## 2. Missing Backend Endpoints Expected by Existing Frontend Clients

### 2.1 Order Service (`services/order-service` — Port `8083`)
Gateway route: `/api/v1/orders/**` (`StripPrefix=3`).

| Method | Gateway Path | Expected Service Path | Frontend Caller File | TypeScript Contract (`frontend/src/types/order.types.ts`) | Status |
|---|---|---|---|---|---|
| `POST` | `/api/v1/orders/quote` | `/quote` | `frontend/src/api/services/orders.api.ts` (`getOrderQuote`) | Req: `OrderQuoteRequest` &rarr; Res: `OrderQuoteResponse` | **Missing on Backend** |
| `POST` | `/api/v1/orders` | `/` | `frontend/src/api/services/orders.api.ts` (`createOrder`) | Req: `CreateOrderRequest` &rarr; Res: `CreateOrderResponse` | **Missing on Backend** |
| `GET` | `/api/v1/orders` | `/` | `frontend/src/api/services/orders.api.ts` (`getCustomerOrders`) | Res: `DeliveryOrder[]` | **Missing on Backend** |
| `GET` | `/api/v1/orders/{id}` | `/{id}` | `frontend/src/api/services/orders.api.ts` (`getOrderById`) | Res: `DeliveryOrder` | **Missing on Backend** |
| `GET` | `/api/v1/orders/tracking/{trackingNumber}` (and `/api/v1/tracking/{trackingNumber}`) | `/tracking/{trackingNumber}` | `frontend/src/api/services/orders.api.ts` (`getPublicTracking`) | Res: `PublicTrackingResponse` | **Missing on Backend** |

---

### 2.2 Dispatch Service — Courier Self-Service (`services/dispatch-service` — Port `8084`)
Gateway route: `/api/v1/dispatch/**` (`StripPrefix=3`).

| Method | Gateway Path | Expected Service Path | Frontend Caller File | TypeScript Contract (`frontend/src/types/courier.types.ts`) | Status |
|---|---|---|---|---|---|
| `GET` | `/api/v1/dispatch/couriers/me` | `/couriers/me` | `frontend/src/api/services/courier.api.ts` (`getMyCourierProfile`) | Res: `CourierProfile` | **Missing on Backend** |
| `PATCH` | `/api/v1/dispatch/couriers/me/availability` | `/couriers/me/availability` | `frontend/src/api/services/courier.api.ts` (`setMyAvailability`) | Req: `{ online: boolean }` &rarr; Res: `CourierProfile` | **Missing on Backend** |
| `GET` | `/api/v1/dispatch/couriers/me/assignments` | `/couriers/me/assignments` | `frontend/src/api/services/courier.api.ts` (`getMyJobs`) | Res: `CourierJob[]` | **Missing on Backend** |
| `POST` | `/api/v1/dispatch/couriers/me/assignments/{id}/accept` | `/couriers/me/assignments/{id}/accept` | `frontend/src/api/services/courier.api.ts` (`acceptJob`) | Res: `CourierJob` | **Missing on Backend** |
| `POST` | `/api/v1/dispatch/couriers/me/assignments/{id}/pickup` | `/couriers/me/assignments/{id}/pickup` | `frontend/src/api/services/courier.api.ts` (`markPickedUp`) | Res: `CourierJob` | **Missing on Backend** |
| `POST` | `/api/v1/dispatch/couriers/me/assignments/{id}/deliver` | `/couriers/me/assignments/{id}/deliver` | `frontend/src/api/services/courier.api.ts` (`completeDelivery`) | Req: `ProofOfDeliveryInput` &rarr; Res: `CourierJob` | **Missing on Backend** |
| `POST` | `/api/v1/dispatch/couriers/me/assignments/{id}/fail` | `/couriers/me/assignments/{id}/fail` | `frontend/src/api/services/courier.api.ts` (`reportFailedDelivery`) | Req: `FailedDeliveryInput` &rarr; Res: `CourierJob` | **Missing on Backend** |

---

### 2.3 Dispatch Service — Dispatcher Operations (`services/dispatch-service` — Port `8084`)
Gateway route: `/api/v1/dispatch/**` (`StripPrefix=3`).

| Method | Gateway Path | Expected Service Path | Frontend Caller File | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/dispatch/deliveries/unassigned` | `/deliveries/unassigned` | `frontend/src/components/dispatcher/deliveries/deliveriesApi.ts` | **Missing on Backend** (Currently mock) |
| `GET` | `/api/v1/dispatch/deliveries/active` | `/deliveries/active` | `frontend/src/components/dispatcher/activeDeliveries/activeDeliveriesApi.ts` | **Missing on Backend** (Currently mock) |
| `GET` | `/api/v1/dispatch/couriers` | `/couriers` | `frontend/src/components/dispatcher/couriers/couriersApi.ts` | **Missing on Backend** (Currently mock) |
| `GET` | `/api/v1/dispatch/couriers/availability` | `/couriers/availability` | `frontend/src/components/dispatcher/deliveries/assignmentService.ts` | **Missing on Backend** |
| `GET` | `/api/v1/dispatch/assignments` | `/assignments` | `frontend/src/components/dispatcher/assignments/assignmentsApi.ts` | **Missing on Backend** (Currently mock) |
| `POST` | `/api/v1/dispatch/assignments` | `/assignments` | `frontend/src/components/dispatcher/deliveries/assignmentService.ts` | **Missing on Backend** |
| `PATCH` | `/api/v1/dispatch/assignments/{id}` | `/assignments/{id}` | `frontend/src/components/dispatcher/assignments/assignmentsApi.ts` | **Missing on Backend** (Currently mock) |
| `GET` | `/api/v1/dispatch/reports/summary` | `/reports/summary` | `frontend/src/components/dispatcher/reports/reportsApi.ts` | **Missing on Backend** (Currently mock) |

---

## 3. Additional Endpoints Required by Confirmed Business Decisions (`BD-01` – `BD-08`)

Beyond the existing frontend stubs, the confirmed business rules in `agents/SwiftDrop_Finalized_Business_Decisions.md` require the following endpoints across the services:

### 3.1 Organization Service (`:8082`) — Route Resolution & Merchant Approval
| Method | Gateway Path | Service Path | Business Decision / Requirement |
|---|---|---|---|
| `POST` | `/api/v1/organization/branches/resolve-route` | `/branches/resolve-route` | Resolve **both** origin branch (pickup coordinates) and destination branch (drop-off coordinates) in a single atomic call for Order Service. |
| `POST` | `/api/v1/organization/merchants/applications` | `/merchants/applications` | Submit a merchant business onboarding application (Sec 7.1). |
| `GET` | `/api/v1/organization/merchants/applications` | `/merchants/applications` | Head Office Admin lists merchant applications with filtering/sorting (replaces mock in `merchantApprovalApi.ts`). |
| `GET` | `/api/v1/organization/merchants/applications/{id}` | `/merchants/applications/{id}` | Head Office Admin views merchant application details. |
| `POST` | `/api/v1/organization/merchants/applications/{id}/approve` | `/merchants/applications/{id}/approve` | Head Office Admin approves merchant application & publishes event. |
| `POST` | `/api/v1/organization/merchants/applications/{id}/reject` | `/merchants/applications/{id}/reject` | Head Office Admin rejects merchant application with reason. |

### 3.2 Order Service (`:8083`) — Lifecycle, Drop-off, Payments & Pricing Rules
| Method | Gateway Path | Service Path | Business Decision / Requirement |
|---|---|---|---|
| `POST` | `/api/v1/orders/{id}/cancel` | `/{id}/cancel` | Customer/Merchant order cancellation under policy (`BD-04`/`UD-11`). |
| `PATCH` | `/api/v1/orders/{id}/status` | `/{id}/status` | Internal/authorized operational status transition endpoint (or event consumer) validating the 14-state machine (`Sec 4`). |
| `GET` | `/api/v1/orders/pricing-rules` | `/pricing-rules` | Retrieve configurable pricing rules (`BD-06`). |
| `PUT` | `/api/v1/orders/pricing-rules` | `/pricing-rules` | Head Office Admin updates configurable pricing rates (`BD-06`). |
| `POST` | `/api/v1/orders/{id}/payment` | `/{id}/payment` | Record prepaid transaction verification or COD collection status (`BD-01`). |

### 3.3 Dispatch Service (`:8084`) — Branch Drop-off, Inter-Branch Transfers & 3-Attempt Escalation
| Method | Gateway Path | Service Path | Business Decision / Requirement |
|---|---|---|---|
| `POST` | `/api/v1/dispatch/branch-receipts` | `/branch-receipts` | Record branch receipt of parcel from customer/merchant drop-off (`BD-04`, `BD-05`) or courier pickup handover (`Sec 4 Step 6`). |
| `POST` | `/api/v1/dispatch/transfers` | `/transfers` | Create an inter-branch transfer manifest (`BD-03`). |
| `GET` | `/api/v1/dispatch/transfers` | `/transfers` | List transfer manifests for origin/destination branch (`BD-03`). |
| `GET` | `/api/v1/dispatch/transfers/{id}` | `/transfers/{id}` | Get transfer manifest details & parcel list (`BD-03`). |
| `POST` | `/api/v1/dispatch/transfers/{id}/assign` | `/transfers/{id}/assign` | Assign a regular courier to an inter-branch transfer manifest (`BD-03`). |
| `POST` | `/api/v1/dispatch/transfers/{id}/dispatch` | `/transfers/{id}/dispatch` | Record dispatch of transfer manifest from origin branch (`BD-03`). |
| `POST` | `/api/v1/dispatch/transfers/{id}/receive` | `/transfers/{id}/receive` | Record receipt & parcel verification of transfer manifest at destination branch (`BD-03`). |
| `GET` | `/api/v1/dispatch/exceptions/pending-decisions` | `/exceptions/pending-decisions` | List parcels in `Pending Dispatcher Decision` state after 3 failed attempts (`BD-02`, `BD-07`). |
| `POST` | `/api/v1/dispatch/exceptions/{orderId}/decision` | `/exceptions/{orderId}/decision` | Record dispatcher's decision (e.g. `RETURN_TO_SENDER`, `APPROVED_RETRY`) with user identity, timestamp, and reason (`BD-07`). |

### 3.4 Notification Service (`:8085`) — In-App Notifications & Webhooks
| Method | Gateway Path | Service Path | Business Decision / Requirement |
|---|---|---|---|
| `GET` | `/api/v1/notifications/me` | `/me` | List in-app notifications for the authenticated user. |
| `PATCH` | `/api/v1/notifications/me/{id}/read` | `/me/{id}/read` | Mark notification as read. |
| `GET` | `/api/v1/notifications/webhooks` | `/webhooks` | Merchant webhook configuration & delivery logs (`Sec 9`). |
