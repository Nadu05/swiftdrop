# SwiftDrop – End-to-End Test & Verification Audit Report

**Audit Date:** 2026-11-14  
**Scope:** Full accounting of executed automated backend & frontend checks, verified E2E coverage, and explicit test-harness limitations uncovered during the PROMPT 09 forensic audit.

---

## 1. Execution Environment & Verification Scope Boundary

- **Environment Checked:** Windows workstation without Docker CLI (`docker --version` unavailable) and without runtime `.env` secrets (`infrastructure/dev/.env` absent; `infrastructure/dev/.env.example` exists).
- **Verified Automatically on This Host:**
  - All **6 Java Maven modules** (`api-gateway`, `identity-service`, `organization-service`, `order-service`, `dispatch-service`, `notification-service`) compiled and passed **270 tests** across **49 test classes** (`0` failures, `0` errors, `0` skipped).
  - Frontend **TypeScript type-check** (`tsc --noEmit`) and **Next.js production build** (`52/52` static/app routes) completed with exit code `0`.
- **Not Executed / Not Verified at Runtime Here:**
  - Multi-container `docker compose up --build` runtime boot.
  - Real PostgreSQL / Neon Flyway migration execution with Hibernate `ddl-auto: validate`.
  - Real RabbitMQ broker queue/exchange/DLQ message delivery.
  - Live browser interaction tests against running backend containers.

---

## 2. Backend Maven Test Execution Ledger (Observed Results)

| Module | Test Command | Test Class Breakdown (Observed Count) | Total | Failures | Errors | Skipped | Result |
|---|---|---|---:|---:|---:|---:|---|
| **`api-gateway`** | `mvn -f api-gateway/pom.xml test` | `HealthControllerTest` (1), `GatewayRoutesAndCorrelationTest` (3) | **4** | 0 | 0 | 0 | **PASS** |
| **`identity-service`** | `mvn -f services/identity-service/pom.xml test` | `AdminControllerTest` (8), `AuthControllerTest` (15), `UserControllerTest` (5), `JwtServiceTest` (4), `AdminServiceTest` (11), `AuthServiceTest` (13), `PasswordServiceTest` (9), `TestItemServiceTest` (6), `UserServiceTest` (9) | **80** | 0 | 0 | 0 | **PASS** |
| **`organization-service`** | `mvn -f services/organization-service/pom.xml test` | `BranchControllerTest` (12), `BranchResolutionControllerTest` (8), `MerchantApplicationControllerTest` (7), `ServiceAreaControllerTest` (9), `BranchResolutionServiceTest` (10), `BranchServiceTest` (11), `MerchantApplicationServiceTest` (6), `OrganizationEventPublisherTest` (3), `ServiceAreaServiceTest` (12), `TestItemServiceTest` (5), `HaversineDistanceCalculatorTest` (4) | **87** | 0 | 0 | 0 | **PASS** |
| **`order-service`** | `mvn -f services/order-service/pom.xml test` | `RestOrganizationServiceClientTest` (3), `OrderControllerTest` (5), `OrderEndToEndAndExceptionTest` (3), `OrderRepositoryIntegrationTest` (1), `OrderEventPublisherTest` (2), `OrderLifecycleServiceTest` (4), `OrderServiceTest` (4), `PricingEngineServiceTest` (5), `TestItemServiceTest` (5), `TrackingNumberGeneratorTest` (4) | **36** | 0 | 0 | 0 | **PASS** |
| **`dispatch-service`** | `mvn -f services/dispatch-service/pom.xml test` | `RestOrderServiceClientTest` (3), `DispatchControllerTest` (5), `TransferAndExceptionControllerTest` (3), `DispatchEndToEndAndExceptionTest` (3), `DispatchRepositoryIntegrationTest` (1), `TransferRepositoryIntegrationTest` (1), `DispatchOutboxAndOrderListenerTest` (4), `DispatchServiceTest` (9), `PodEvidenceStorageServiceTest` (4), `TestItemServiceTest` (5), `TransferAndExceptionServiceTest` (7) | **45** | 0 | 0 | 0 | **PASS** |
| **`notification-service`** | `mvn -f services/notification-service/pom.xml test` | `NotificationControllerTest` (5), `NotificationEndToEndWorkflowTest` (1), `NotificationRepositoryIntegrationTest` (1), `CrossServiceJwtCompatibilityTest` (2), `NotificationServiceTest` (4), `TestItemServiceTest` (5) | **18** | 0 | 0 | 0 | **PASS** |
| **Backend Total** | **6 modules** | **49 test classes** | **270** | **0** | **0** | **0** | **PASS** |

---

## 3. Frontend Verification Ledger (Observed Results)

| Check | Command | Observed Output | Result |
|---|---|---|---|
| **TypeScript Type Check** | `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit` | Exited `0` with zero compiler errors | **PASS** |
| **Next.js Production Build** | `npm --prefix frontend run build` | Exited `0`; compiled cleanly; `Finished TypeScript`; `Generating static pages using 7 workers (52/52)` | **PASS** |
| **Frontend Automated Unit / E2E Tests** | *(None configured)* | `frontend/package.json` contains no test runner (`scripts`: `dev`, `build`, `start`, `lint`) and `0` `*.test.*`/`*.spec.*` files exist | **MISSING** |

---

## 4. End-to-End & Exception Scenarios Covered by Current Test Suites

- **API Gateway (`GatewayRoutesAndCorrelationTest.java`)**: Verifies route registration across services and `X-Correlation-Id` generation/preservation.
- **Order Service (`OrderEndToEndAndExceptionTest.java`, `OrderServiceTest.java`, `OrderControllerTest.java`, `OrderLifecycleServiceTest.java`, `PricingEngineServiceTest.java`)**: Verifies dual-branch quote calculation, prepaid order creation -> outbox persistence -> invalid/valid provisional payment confirmation -> public tracking, uncovered address 422 (`InvalidBranchCoverageException` with mocked `OrganizationServiceClient`), organization-service outage 503 (`ExternalServiceUnavailableException`), broker outage outbox retention, and cross-service JWT signature parity.
- **Dispatch Service (`DispatchEndToEndAndExceptionTest.java`, `DispatchServiceTest.java`, `TransferAndExceptionServiceTest.java`, `DispatchOutboxAndOrderListenerTest.java`, `PodEvidenceStorageServiceTest.java`)**: Verifies `OrderConfirmed` inbox consumption & duplicate `eventId` dedup, pickup task -> courier assignment & reassignment -> pickup confirmation -> Colombo-to-Kandy `TransferManifest` dispatch & completion -> final delivery with POD capture -> outbox event persistence, 3-attempt escalation (`DeliveryException` + `RETURN_TO_SENDER` + `ReturnTask`), manifest missing-parcel discrepancy handling, and JWT signature parity.
- **Notification Service (`NotificationEndToEndWorkflowTest.java`, `CrossServiceJwtCompatibilityTest.java`, `NotificationServiceTest.java`, `NotificationControllerTest.java`)**: Verifies processing of domain event names across merchant onboarding, order, pickup, transfer, delivery, and RTS; contact cache lookup (`notification_order_contacts`); duplicate `eventId` skip (`processed_domain_events`); email masking on `/notifications/tracking/{trackingNumber}`; `FAILED` audit row persistence + `NotificationDeliveryException` rethrow + admin `retryFailedNotifications` recovery; JWT secret compatibility and expiration/mismatch rejection.

---

## 5. Critical Test Coverage & Harness Limitations Exposed by Audit

Even where tests pass (`270/270`), the audit proved those suites **do not establish production readiness** due to structural test-harness simplifications:

1. **All Persistence Tests Bypass Flyway & PostgreSQL Validation:**
   - Every `@DataJpaTest` and repository test disables Flyway (`spring.flyway.enabled=false`) and sets `spring.jpa.hibernate.ddl-auto=create-drop` against in-memory **H2** (`MODE=PostgreSQL`).
   - **Masked production crash:** `dispatch-service` and `notification-service` `TestItem.java` (`TEXT` / nullable `updatedAt`) disagree with `V1__create_test_items.sql` (`VARCHAR(1000)` / `NOT NULL`), and `identity-service` `V5` `TIMESTAMPTZ` disagrees with `LocalDateTime` fields — bugs invisible in H2 `create-drop` that risk startup failure under PostgreSQL `ddl-auto: validate`.
2. **All RabbitMQ Messaging Tests Mock the Broker:**
   - `spring-rabbit-test` and `testcontainers` are absent from all `pom.xml` files. All outbox/consumer tests inject mocked `RabbitTemplate`/`ApplicationEventPublisher` and invoke `attemptPublish` or `@RabbitListener` handler methods directly, leaving real AMQP bindings, JSON serialization, `@TransactionalEventListener(AFTER_COMMIT)`, `@Scheduled` relays, concurrent worker locking, and DLQ routing unverified.
3. **Security Filter & Cross-Branch Tests Mask Production Bypasses:**
   - `identity-service` controller tests (`AdminControllerTest`, `AuthControllerTest`, `UserControllerTest`) use `@AutoConfigureMockMvc(addFilters = false)`.
   - `CrossServiceJwtCompatibilityTest`, `OrderEndToEndAndExceptionTest`, `DispatchEndToEndAndExceptionTest`, and `DispatchServiceTest` construct synthetic tokens/principals containing hardcoded `branchId` / `organizationId` claims that `identity-service` `JwtService` never mints, hiding `branchId == null` fail-open cross-branch access.
   - No tests verify rejection of unauthenticated `X-User-Roles`/`X-User-Id` spoofing (`OrderJwtAuthenticationFilter`, `NotificationJwtAuthenticationFilter`), `X-Branch-Id` spoofing (`DispatchJwtAuthenticationFilter`), or unprotected `organization-service` write endpoints.
4. **E2E Suite Wiring & Payload Divergences:**
   - `DispatchEndToEndAndExceptionTest` omits wiring `ReturnTaskService` onto `DispatchService`, hiding automatic return-task creation when `resolveException(RETURN_TO_SENDER)` runs in Spring runtime (`DispatchService.java:1312-1319`).
   - `NotificationEndToEndWorkflowTest.java:114,120` sends `"taskType": "PICKUP"` and `"attemptCount": 1` whereas `NotificationService` reads `"assignmentType"` and `"attemptNumber"`.
   - `DispatchEndToEndAndExceptionTest.java:342-346` explicitly asserts the buggy `"FAILED"` return status on `recordFailedDelivery` (`AssignmentStatus`) while `DeliveryJob.status` is `PENDING_DISPATCHER_DECISION`.
5. **Untested Business Paths:**
   - `OrderService.cancelOrder`, `listOrders`, `recordBranchDropoff`, `updateOrderStatus`, Colombo geocoding fallback bypass, `PricingQuote` expiry, `DispatchService` acceptance of `PENDING_PAYMENT` orders, `RESCHEDULE_DELIVERY` 4th-attempt Order sync, `HOLD_AT_BRANCH` deadlock, `completeManifest` with open discrepancies, `MARK_FOUND_RESUME` manifest counts, and `NotificationService.retryFailedNotifications` double-failure `notification_code` collision have zero automated test coverage.
6. **Zero Frontend Tests & Empty CI Workflows:**
   - `frontend/` has 0 unit, component, contract, or Playwright tests, allowing enum/DTO regressions like `'BRANCH_DROP_OFF'` and `DeliveryJobDto` field mismatches to pass `next build`.
   - `.github/workflows/neon-develop-migration.yml` and `.github/workflows/neon-preview.yml` are empty (0 bytes).
