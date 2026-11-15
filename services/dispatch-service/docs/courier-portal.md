# Courier Portal (dispatch-service)

Backend for the courier pages at `/courier` in the frontend. Kept separate from the dispatcher assignment
flow: job **status changes** use `PATCH /api/v1/dispatch/assignments/{id}/status` (AssignmentController).

## Identity (temporary)
Until Identity login and Gateway header injection exist, callers send `X-User-Id` (the courier's
`couriers.user_id`) and `X-User-Role: COURIER`. Missing/invalid → 401, other roles → 403, no linked courier → 404.

## Endpoints (`/api/v1/dispatch/couriers/me`, or `/couriers/me` behind the gateway)
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Profile and current workload |
| PATCH | `/availability` | `{ "online": true/false }` → AVAILABLE / OFFLINE (BUSY left alone) |
| GET | `/assignments?limit=` | Jobs (ASSIGNED…FAILED) with pickup, recipient and parcel details |
| PUT | `/assignments/{id}/proof-of-delivery` | `{ type: OTP/SIGNATURE/PHOTO, reference, receivedBy }`, job must be IN_TRANSIT |
| PUT | `/assignments/{id}/failure-details` | `{ reason, notes }`, job must be IN_TRANSIT |

Courier flow: accept (`ACCEPTED`) → pick up (`IN_TRANSIT`) → save proof → `DELIVERED`
(or save failure details → `FAILED` with the reason as `notes`).

## Delivery details
`courier_deliveries` (migration V4) holds one row per assignment: an order snapshot plus proof of delivery and
failure details. When the courier lists jobs, open jobs without a row are filled in once from Order's
`GET /orders/ready-for-dispatch` (the order stays there until picked up). If Order is unreachable the jobs are
still returned, just without details. Set `ORDER_SERVICE_API_KEY` to send `X-Service-Key` once Order's auth is on.

## Local testing
1. Start dispatch-service with your own database (`SPRING_DATASOURCE_URL/USERNAME/PASSWORD`).
2. Optionally run `dev-seed/courier_portal_dev_seed.sql` (dev only, never on a shared DB): courier CR-103, user id 990103.
3. Swagger: http://localhost:8084/swagger-ui.html, headers `X-User-Id: 990103`, `X-User-Role: COURIER`.
4. Frontend `.env.local`: `NEXT_PUBLIC_DISPATCH_API_MODE=api`, `NEXT_PUBLIC_DEV_COURIER_USER_ID=990103`.

## Not yet
Payout amounts and branch names have no source yet; order-service does not yet consume the dispatch status events.
