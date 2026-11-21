# SwiftDrop — Remaining Implementation Gap & Environment Report

**Document:** `docs/remaining-implementation-gap-report.md`  
**Audit Date:** 2026-11-14

---

## 1. Environment & Live Runtime Verification Gaps

| Gap / Constraint | Observed Evidence | Impact & Required Next Action |
|---|---|---|
| **Docker CLI Unavailable on Verification Host** | `docker --version` returned `CommandNotFoundException`; neither `infrastructure/dev/.env` nor `infrastructure/local/.env` exists on disk (`.env.example` template exists). | Live multi-container Docker Compose boot (`infrastructure/dev/docker-compose.yml`), live PostgreSQL Flyway migration runs against Neon/PostgreSQL, and live RabbitMQ broker socket delivery tests could not run on this workstation. All verification ran via Maven H2 (`MODE=PostgreSQL`), Spring `WebMvcTest`, `MockRestServiceServer`, and Next.js production builds. Run `docker compose up --build` with a populated `.env` on a Docker host for live smoke validation. |
| **Frontend Service Missing from `infrastructure/dev/docker-compose.yml`** | `frontend/Dockerfile` exists, while `infrastructure/dev/docker-compose.yml` defines 7 services (`rabbitmq`, `identity-service`, `organization-service`, `order-service`, `dispatch-service`, `notification-service`, `api-gateway`). | Developers running `infrastructure/dev/docker-compose.yml` currently start `frontend` locally (`npm run dev` / `npm run start`) or add a `frontend` container definition pointing at `http://api-gateway:8080`. |

---

## 2. Provisional External Integrations (Awaiting Vendor Credentials)

| Boundary | Current Implementation | Production Readiness Requirement |
|---|---|---|
| **Online Payment Gateway (`PaymentVerificationPort`)** | `ProvisionalPaymentVerificationService` in `order-service` enforces fail-closed prepaid verification (only explicitly verified references matching `PAY-VERIFIED-*` or `TXN-VERIFIED-*` transition orders to `PAID` + `CONFIRMED`). | Replace or implement an additional `PaymentVerificationPort` bean backed by the selected gateway SDK / webhook signature verifier (e.g. Stripe/PayHere) once merchant credentials are provisioned. |
| **Email & SMS Notification Transport (`NotificationSenderPort`)** | `LoggingNotificationSender` in `notification-service` implements `NotificationSenderPort` alongside persistent DB notification records, `REQUIRES_NEW` failure audit logging, and AMQP retry/DLQ recovery. | Plug in an SMTP / SendGrid email provider and SMS gateway adapter implementing `NotificationSenderPort`. |

---

## 3. Secondary / Backlog Enhancements

- **Frontend Notification Inbox UI:** `frontend/src/api/services/notifications.api.ts` now exposes typed client methods for `/api/v1/notifications`, `/me`, `/tracking/{trackingNumber}`, `/{id}/read`, and `/retry-failed`; optional UI bell/inbox panels can be wired to this client cleanly.
- **Developer-Only `/demo-login` Page Isolation:** All production authentication and operational portals (`/login`, `/book`, `/bookings`, `/tracking`, `/dispatcher/**`, `/courier/**`, `/organization/**`, `/admin/**`) use real gateway HTTP APIs and orphaned mock operational stores were removed. `frontend/src/app/demo-login/page.tsx` and legacy `loginUser`/`switchRole` fallback helpers in `frontend/src/api/services/auth.api.ts` remain isolated strictly to the optional `/demo-login` developer convenience route.
- **Identity Service Event Bridge:** `identity-service` emits internal identity audit events on `swiftdrop.identity.exchange` (`IdentityEventPublisher`); bridging identity lifecycle alerts to `notification-service` on `swiftdrop.events` can be added if user-account emails move off direct SMTP.
- **Dynamic Pricing Rules & Merchant Webhooks UI:** Static configuration exists in `order-service` (`PricingProperties`); admin UI screens for live pricing tariff management and outbound signed merchant webhook delivery remain future enhancement scope.

