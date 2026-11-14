# SwiftDrop – End-to-End Test & Verification Report

This report records the automated backend, gateway, cross-service security, event-flow, and frontend build checks executed after integrating all SwiftDrop microservices, RabbitMQ event contracts, transactional outbox/inbox handlers, and frontend clients.

---

## 1. Execution Environment & Scope Boundary

- **Host environment**: Windows workstation without Docker CLI (`docker --version` unavailable) and without local `.env` credentials (`infrastructure/dev/.env.example` provides the template).
- **What WAS executed and verified automatically**:
  - Full Maven Surefire unit, controller (`MockMvc`), Spring Cloud Gateway route/filter, JPA repository (`@DataJpaTest` with H2 in PostgreSQL compatibility mode), cross-service JWT compatibility, and Spring service-level end-to-end workflow tests across all 6 backend Java modules (`api-gateway`, `identity-service`, `organization-service`, `order-service`, `dispatch-service`, `notification-service`).
  - Frontend TypeScript type-checking (`tsc --noEmit`) and full Next.js production build across all 52 routes.
- **What was NOT executed on this host**:
  - Live multi-container Docker Compose stack startup (`infrastructure/dev/docker-compose.yml`).
  - Live RabbitMQ AMQP broker topology creation (`swiftdrop.events` queues/bindings/DLQs) and live PostgreSQL/Neon Flyway migrations against real external databases.
  - Live browser Playwright/manual walkthrough against running containers.

---

## 2. Backend Maven Test Summary

All 6 backend modules compiled cleanly and passed with **0 failures, 0 errors, and 0 skipped tests** (**270 total tests**):

| Module | Test Suites Covered | Tests Run | Failures | Errors | Skipped | Status |
|---|---|---:|---:|---:|---:|---|
| `api-gateway` | `HealthControllerTest` (1), `GatewayRoutesAndCorrelationTest` (3) | 4 | 0 | 0 | 0 | PASS |
| `identity-service` | `AdminControllerTest` (8), `AuthControllerTest` (15), `UserControllerTest` (5), `JwtServiceTest` (4), `AdminServiceTest` (11), `AuthServiceTest` (13), `PasswordServiceTest` (9), `TestItemServiceTest` (6), `UserServiceTest` (9) | 80 | 0 | 0 | 0 | PASS |
| `organization-service` | `BranchControllerTest` (12), `BranchResolutionControllerTest` (8), `MerchantApplicationControllerTest` (7), `ServiceAreaControllerTest` (9), `BranchResolutionServiceTest` (10), `BranchServiceTest` (11), `MerchantApplicationServiceTest` (6), `OrganizationEventPublisherTest` (3), `ServiceAreaServiceTest` (12), `TestItemServiceTest` (5), `HaversineDistanceCalculatorTest` (4) | 87 | 0 | 0 | 0 | PASS |
| `order-service` | `RestOrganizationServiceClientTest` (3), `OrderControllerTest` (5), `OrderEndToEndAndExceptionTest` (3), `OrderRepositoryIntegrationTest` (1), `OrderEventPublisherTest` (2), `OrderLifecycleServiceTest` (4), `OrderServiceTest` (4), `PricingEngineServiceTest` (5), `TestItemServiceTest` (5), `TrackingNumberGeneratorTest` (4) | 36 | 0 | 0 | 0 | PASS |
| `dispatch-service` | `RestOrderServiceClientTest` (3), `DispatchControllerTest` (5), `TransferAndExceptionControllerTest` (3), `DispatchEndToEndAndExceptionTest` (3), `DispatchRepositoryIntegrationTest` (1), `TransferRepositoryIntegrationTest` (1), `DispatchOutboxAndOrderListenerTest` (4), `DispatchServiceTest` (9), `PodEvidenceStorageServiceTest` (4), `TestItemServiceTest` (5), `TransferAndExceptionServiceTest` (7) | 45 | 0 | 0 | 0 | PASS |
| `notification-service` | `NotificationControllerTest` (5), `NotificationEndToEndWorkflowTest` (1), `NotificationRepositoryIntegrationTest` (1), `CrossServiceJwtCompatibilityTest` (2), `NotificationServiceTest` (4), `TestItemServiceTest` (5) | 18 | 0 | 0 | 0 | PASS |
| **Total** | **48 test classes across 6 modules** | **270** | **0** | **0** | **0** | **PASS** |

---

## 3. Frontend Verification Summary

| Check | Command | Observed Result | Status |
|---|---|---|---|
| TypeScript check | `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit` | Exit code `0` | PASS |
| Production build | `npm --prefix frontend run build` | Exit code `0`; `Compiled successfully in 14.4s`; `Finished TypeScript in 16.2s`; `Generating static pages using 7 workers (52/52) in 1759ms` | PASS |

Verified frontend cleanups and integrations:
- Removed orphaned mock data files under `frontend/src/api/services/courier.mock.ts` and legacy dispatcher mock modules after confirming zero active imports.
- Confirmed `frontend/src/app/(auth)/login/page.tsx` uses the live Identity Service auth hook/store (legacy mock auth helper in `auth.api.ts` remains isolated to `/demo-login`).
- Added typed `frontend/src/api/services/notifications.api.ts` matching `NotificationController` (`/api/v1/notifications`, `/me`, `/tracking/{trackingNumber}`, `/{idOrCode}/read`, `/retry-failed`).

---

## 4. End-to-End & Exception Scenarios Covered

### 4.1 API Gateway Routing & Correlation Propagation
Verified in [GatewayRoutesAndCorrelationTest.java](file:///C:/Users/naduk/.gemini/antigravity/worktrees/EAD/identity_service_auth_foundation/api-gateway/src/test/java/com/swiftdrop/gateway/GatewayRoutesAndCorrelationTest.java):
- `routeLocatorContainsAllCoreMicroserviceRoutes`: confirms Spring Cloud Gateway loads all route definitions to downstream services.
- `correlationIdGlobalFilterGeneratesAndPropagatesHeaderWhenMissing`: generates an `X-Correlation-ID` response/downstream header when absent.
- `correlationIdGlobalFilterPreservesExistingHeader`: preserves incoming `X-Correlation-ID` across requests.

### 4.2 Order Creation, Payment Verification & Failure Handling
Verified in [OrderEndToEndAndExceptionTest.java](file:///C:/Users/naduk/.gemini/antigravity/worktrees/EAD/identity_service_auth_foundation/services/order-service/src/test/java/com/swiftdrop/order/e2e/OrderEndToEndAndExceptionTest.java) alongside `OrderServiceTest`, `OrderControllerTest`, `OrderEventPublisherTest`, and `RestOrganizationServiceClientTest`:
- `happyPathQuotePrepaidOrderInvalidPaymentThenConfirmedEmitsOrderedOutboxEventsAndSupportsTracking`: calculates a dual-branch quote, creates a prepaid order (`CREATED` / `PENDING_PAYMENT`), persists `OrderCreated` outbox event, rejects invalid payment verification, accepts valid payment confirmation to emit `OrderConfirmed` and `OrderStatusChanged`, and verifies public/authenticated tracking lookup.
- `exceptionScenarios_NoCoverageServiceDownAndBrokerDownPersistOutboxForRetry`: verifies uncovered pickup/destination coordinates fail with `InvalidBranchCoverageException`, `organization-service` outages throw `ExternalServiceUnavailableException`, and RabbitMQ broker failure during outbox relay leaves pending outbox events persisted for scheduler retry without rolling back order state.
- `crossServiceJwtValidationSupportsAlignedBase64AndEnvExampleNonBase64Secrets`: verifies `OrderJwtService` validates tokens signed with both the default Base64 secret and `.env.example` non-Base64 secret string (`LqGNrUIqkMSHFLbEriynybtuXfmPa2yH8Q64GYK1dDB`).

### 4.3 Inter-Branch Dispatch, Transfer Manifests & Exception Handling
Verified in [DispatchEndToEndAndExceptionTest.java](file:///C:/Users/naduk/.gemini/antigravity/worktrees/EAD/identity_service_auth_foundation/services/dispatch-service/src/test/java/com/swiftdrop/dispatch/e2e/DispatchEndToEndAndExceptionTest.java) alongside `DispatchServiceTest`, `TransferAndExceptionServiceTest`, `DispatchOutboxAndOrderListenerTest`, and controller tests:
- `fullInterBranchHappyPathWithReassignmentAndOutboxEvents`: consumes `OrderConfirmed`, deduplicates duplicate `eventId` deliveries via `processed_domain_events`, creates a pickup task, performs courier assignment and reassignment, confirms parcel pickup and origin branch receipt, creates/dispatches/receives an inter-branch Colombo-to-Kandy `TransferManifest` (auto-completing when all parcels match), assigns final-mile delivery courier (`OutForDelivery`), completes Proof of Delivery (`DeliveryCompleted`), and verifies persisted outbox events.
- `failedDeliveryEscalationReturnToSenderAndManifestDiscrepancyExceptions`: enforces the 3-attempt delivery retry limit (blocking a 4th attempt), transitions the `DeliveryJob` to `PENDING_DISPATCHER_DECISION`, executes `RETURN_TO_SENDER` dispatcher decision (`ReturnedToSender`), and records missing-parcel manifest discrepancy exceptions on partial receipt.
- `crossServiceJwtValidationSupportsAlignedAndEnvExampleSecrets`: verifies `DispatchJwtService` accepts tokens signed with both the aligned default Base64 secret and the `.env.example` secret.

### 4.4 Notifications, Idempotency, PII Masking & Cross-Service JWT Compatibility
Verified in [NotificationEndToEndWorkflowTest.java](file:///C:/Users/naduk/.gemini/antigravity/worktrees/EAD/identity_service_auth_foundation/services/notification-service/src/test/java/com/swiftdrop/notification/e2e/NotificationEndToEndWorkflowTest.java) and [CrossServiceJwtCompatibilityTest.java](file:///C:/Users/naduk/.gemini/antigravity/worktrees/EAD/identity_service_auth_foundation/services/notification-service/src/test/java/com/swiftdrop/notification/security/CrossServiceJwtCompatibilityTest.java):
- `processesAllRequiredDomainEventsWithContactCachingDeduplicationFailureAuditAndPiiMasking`: processes `MerchantApplicationSubmitted`, `MerchantApplicationApproved`, `OrderCreated` (populating `notification_order_contacts`), `OrderConfirmed`, `PickupTaskCreated`, `CourierAssigned`, `ParcelPickedUp`, `ParcelReceivedAtBranch`, `TransferManifestDispatched`, `ParcelReceivedAtDestinationBranch`, `OutForDelivery`, `DeliveryAttemptFailed`, `DeliveryCompleted`, and `ReturnToSenderInitiated`; verifies duplicate `eventId` deduplication via `processed_domain_events`; masks email PII on public tracking notifications; persists a `FAILED` audit row via `NotificationAuditHelper` on `NotificationDeliveryException` before rethrowing for AMQP retry/DLQ; and verifies admin `retryFailedNotifications` recovery to `SENT`.
- `identityIssuedTokensVerifyWithAlignedDefaultAndEnvExampleNonBase64Secrets` & `expiredOrMismatchedSecretTokensAreRejected`: verify shared HS256 secret parity and rejection of invalid/expired tokens.

---

## 5. Remaining Checks Required in a Live Runtime Environment

Before marking production staging sign-off complete on a machine with Docker and valid `.env` credentials:
1. Run `docker compose -f infrastructure/dev/docker-compose.yml --env-file infrastructure/dev/.env up --build` and verify `/actuator/health` / health checks on `api-gateway` (`8080`) and services (`8081`–`8085`).
2. Verify Flyway migrations (`db/migration`) apply cleanly on PostgreSQL/Neon schemas for every service.
3. Verify live RabbitMQ queue bindings, DLQs (`swiftdrop.events.dlx`), and retry behavior under real broker disconnects.
4. Exercise browser login, booking quotation/creation, dispatcher assignment/manifest transfers, courier POD upload, and notification reads end-to-end through `api-gateway`.

