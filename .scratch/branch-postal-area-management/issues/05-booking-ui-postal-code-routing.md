# 05: Customer & Merchant Booking UI Postal Code Routing

**What to build:** End-to-end postal-code-driven booking in the frontend: add searchable pickup and drop-off Sri Lankan **Postal Area** / postal code selectors to the customer and merchant booking flow (`/book`), wire them to live `POST /api/v1/orders/quote` and `POST /api/v1/orders` requests, display resolved origin and destination branches, and present clear unsupported-service-area feedback on `422` responses.

**Blocked by:** 04: Postal-Code-First Branch Resolution in Organization & Order Services

**Status:** ready-for-agent

- [ ] `/book` captures pickup and drop-off Sri Lankan postal codes via searchable Postal Area / postal code inputs backed by Organization Service location lookup APIs.
- [ ] Live quote requests send `pickupPostalCode` and `dropoffPostalCode` and display the resolved origin and destination branches alongside the fee breakdown.
- [ ] Order submission sends `pickupPostalCode` and `dropoffPostalCode` and persists the order with resolved branches.
- [ ] HTTP `422` unsupported-service-area responses display a clear, actionable message identifying whether pickup or destination is outside active Branch Coverage and prevent submission.
- [ ] Frontend TypeScript check and Next.js production build pass cleanly.
