# SwiftDrop Audit Remediation – API Contract Changes

## Phase 1: Security & Authorization Changes

### 1. Removal of Unauthenticated `X-User-*` and `X-Branch-Id` Header Overrides (`GAP-SEC-01`, `GAP-SEC-03`)
- **Affected Services**: `api-gateway`, `order-service`, `dispatch-service`, `notification-service`
- **Previous Behavior**:
  - `order-service` and `notification-service` fell back to client-supplied `X-User-Id`, `X-User-Email`, `X-Organization-Id`, and `X-User-Roles` headers when a valid JWT was absent.
  - `dispatch-service` allowed client-supplied `X-Branch-Id` headers to override the authenticated user's `branchId` claim.
- **New Behavior**:
  - `api-gateway` strips client-supplied `X-User-Id`, `X-User-Email`, `X-User-Roles`, `X-Organization-Id`, `X-Branch-Id`, and `X-Internal-Service` headers on all incoming requests.
  - All protected endpoints require a valid signed JWT (`sd_access_token` cookie or `Authorization: Bearer <token>`) issued by `swiftdrop-identity-service`.
  - Requests lacking a valid JWT return `401 Unauthorized`.

### 2. JWT Claims Contract (`GAP-SEC-03`, `GAP-SEC-05`, `GAP-BIZ-01`)
- **Affected Services**: `identity-service`, `organization-service`, `order-service`, `dispatch-service`, `notification-service`
- **New/Standardized Claims**:
  - `iss`: `"swiftdrop-identity-service"` (now strictly validated via `requireIssuer` by all downstream services)
  - `sub` / `userId`: User UUID string
  - `email`: User email address
  - `roles`: Array of canonical roles (`HEAD_OFFICE_ADMIN`, `ADMIN`, `BRANCH_MANAGER`, `BRANCH_STAFF`, `DISPATCHER`, `COURIER`, `CUSTOMER`, `MERCHANT`, or `INTERNAL_SERVICE` for S2S tokens)
  - `branchId`: Optional `Long` representing the user's assigned branch ID (required for `BRANCH_MANAGER`, `BRANCH_STAFF`, and `DISPATCHER`)
  - `organizationId`: Optional `String` representing the merchant organization/application ID

### 3. Organization Service Endpoint Protection (`GAP-SEC-02`)
- **Affected Service**: `organization-service`
- **New Authorization Rules**:
  - `POST /branches`, `POST /service-areas`, `PATCH /service-areas/{id}`: Requires `HEAD_OFFICE_ADMIN` or `ADMIN`.
  - `PATCH /branches/{id}`: Requires `HEAD_OFFICE_ADMIN`, `ADMIN`, or `BRANCH_MANAGER` (matching `branchId`).
  - `POST /merchants/applications`: Requires authenticated user (`CUSTOMER` or `MERCHANT`).
  - `GET /merchants/applications/my`: Requires authenticated user.
  - `GET /merchants/applications`, `GET /merchants/applications/summary`, `GET /merchants/applications/approved`, `POST /merchants/applications/{id}/approve`, `POST /merchants/applications/{id}/reject`: Requires `HEAD_OFFICE_ADMIN`, `ADMIN`, or `INTERNAL_SERVICE` (for S2S verification).
  - `GET /merchants/applications/{id}`: Requires `HEAD_OFFICE_ADMIN`, `ADMIN`, `INTERNAL_SERVICE`, or the owning applicant (`applicantUserId == principal.userId()`).

### 4. Public Tracking PII Redaction (`GAP-SEC-07`)
- **Affected Endpoints**:
  - `GET /api/v1/orders/tracking/{trackingNumber}` (`order-service`): Timeline event `location` and `description` values are sanitized to remove street addresses and recipient full names.
  - `GET /api/v1/notifications/tracking/{trackingNumber}` (`notification-service`): Returns `List<PublicTrackingNotificationDto>` containing only `trackingNumber`, `eventType`, `channel`, `deliveryStatus`, `sentAt`, and `createdAt` (omitting `recipientName`, `recipientEmail`, `recipientPhone`, `orderId`, `eventId`, `correlationId`, and raw PII `message`).

