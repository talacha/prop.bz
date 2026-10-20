# 02 — API Design

Companion spec: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1, source of truth for contract/test generation).

## 1. Principles

- REST + JSON, versioned under `/v1`. Webhooks outbound and inbound for async events.
- **Money is integer minor units + ISO currency** (`{"amount": 12500, "currency": "USD"}`), never floats.
- **Dates are `YYYY-MM-DD` local to the property's timezone**; stay is half-open `[check_in, check_out)`. Timestamps are RFC 3339 UTC.
- **Idempotency**: every `POST` that creates money/booking state requires `Idempotency-Key` (UUID, 24 h replay window).
- **Cursor pagination** (`?limit=&cursor=`), RFC 9457 `application/problem+json` errors.
- **Price is server-authoritative.** Client gets a signed *quote* (`quote_id`, 15 min TTL); booking consumes the quote, so the shown price is the charged price.
- **Holds before payment.** A booking is `pending_payment` and holds the dates for 15 min; the DB prevents overlap (see backend).
- Auth: OAuth2/OIDC bearer JWT (short-lived, 15 min) + rotating refresh token; guests may book via **passwordless email magic link / OTP**; API keys (`atm_live_…`, scoped, hashed at rest) for channel partners and host integrations.
- Roles: `guest`, `host` (owner/manager of specific properties), `staff`, `admin`. Authorisation is object-level (see security doc).

## 2. Resource map

| Area | Endpoints |
|---|---|
| **Auth** | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `DELETE /me` (GDPR/LFPDPPP erasure) |
| **Properties (public)** | `GET /properties` (search), `GET /properties/{id|slug}`, `GET /properties/{id}/availability`, `GET /properties/{id}/reviews`, `GET /properties/{id}/calendar` (month view with min-stay + nightly price) |
| **Quotes** | `POST /quotes` → price breakdown, rules check, `quote_id` |
| **Bookings** | `POST /bookings` (from quote), `GET /bookings`, `GET /bookings/{id}`, `POST /bookings/{id}/cancel`, `POST /bookings/{id}/modify` (re-quote), `GET /bookings/{id}/itinerary` (check-in info, released after payment) |
| **Payments** | `POST /bookings/{id}/payment-intent`, `GET /bookings/{id}/payments`, `POST /bookings/{id}/refunds` (host/staff). Stripe webhook: `POST /webhooks/stripe` |
| **Messaging** | `GET /threads`, `GET /threads/{id}/messages`, `POST /threads/{id}/messages` (+ SSE `/threads/{id}/stream`) |
| **Reviews** | `POST /bookings/{id}/review` (double-blind, 14 d window), `POST /reviews/{id}/response` |
| **Inquiries** | `POST /inquiries` (replaces the old contact webform; spam-protected) |
| **Host: properties** | `POST/PATCH/DELETE /host/properties`, `PUT /host/properties/{id}/amenities`, `POST /host/properties/{id}/photos` (signed upload URL), `PUT …/photos/order` |
| **Host: pricing & rules** | `PUT /host/properties/{id}/pricing` (base, weekend, seasons, length-of-stay discounts, cleaning fee, extra-guest fee, deposit), `PUT …/rules` (min/max stay, advance notice, prep days, check-in window, house rules, cancellation policy) |
| **Host: calendar** | `GET/PUT /host/properties/{id}/calendar` (blocks, price overrides), `GET /ical/{token}.ics` (optional read-only export for the owner's own calendar app) |
| **Host: bookings** | `GET /host/bookings`, `POST /host/bookings` (manual/offline booking), `POST /host/bookings/{id}/approve|decline` (request-to-book mode) |
| **Owner: payments & reports** | `GET /host/payouts` (read-only Stripe payouts), `GET /host/reports/occupancy|revenue|fees|taxes`, `POST /host/invoices` (CFDI request). `POST /host/payout-account` (Stripe Connect onboarding) is Phase 2 and only for multi-owner |
| **Admin** | `GET /admin/users|bookings|disputes`, `POST /admin/disputes/{id}/resolve`, audit log read |
| **Webhooks (outbound)** | `POST/GET/DELETE /host/webhook-endpoints`; events: `booking.created|confirmed|cancelled|modified`, `payment.succeeded|failed|refunded`, `payout.paid`, `message.created`, `review.created` |
| **Meta** | `GET /health`, `GET /.well-known/jwks.json` |

## 3. Key flows

### 3.1 Search → quote → book → pay

```
GET  /v1/properties?check_in=2026-12-20&check_out=2026-12-27&guests=4&bbox=...&amenities=pool,wifi&sort=price
GET  /v1/properties/solea-5/availability?from=2026-12-01&to=2027-01-31
POST /v1/quotes {property_id, check_in, check_out, guests:{adults:2,children:2,pets:0}, promo_code?}
  → 200 {quote_id, expires_at, nights:[{date,price}], lines:[
        {type:"accommodation", amount:56000}, {type:"cleaning_fee", amount:6000},
        {type:"service_fee", amount:0}, {type:"tax_iva", amount:...}, {type:"tax_ish", amount:...}],
      total:{amount,currency}, cancellation_policy, payment_schedule}
POST /v1/bookings   (Idempotency-Key) {quote_id, guest:{name,email,phone}, message?}
  → 201 {id, status:"pending_payment", hold_expires_at, client_secret}
(client confirms with Stripe Payment Element)
webhook payment_intent.succeeded → status "confirmed", itinerary released, emails/WhatsApp sent
```

### 3.2 Booking state machine

```
requested → (host approve) → pending_payment → confirmed → checked_in → completed
     ↓ decline/timeout          ↓ hold expires / pay fail     ↓ cancel          
   declined                    expired                      cancelled_by_guest | cancelled_by_host
```
Instant-book properties skip `requested`. Transitions are enforced in one domain service and emit outbox events.

### 3.3 Payment schedule

Configurable per property: `full_upfront` | `deposit_30_balance_14d_before` | `pay_at_property_with_card_hold`. Balance charge uses saved payment method (off-session SetupIntent). Failed balance → 3 retries, then host-configurable auto-cancel.

### 3.4 Calendar

Our database is the only source of truth: there are no integrations with third-party marketplaces. Offline bookings (WhatsApp, phone, walk-in) are entered by staff through `POST /host/bookings` and go through the same overlap constraint. An optional tokenised read-only `.ics` feed lets the owner see bookings in their own calendar app.

## 4. Error model

```json
{ "type":"https://api.atm.example/errors/dates-unavailable",
  "title":"Dates no longer available","status":409,"code":"DATES_UNAVAILABLE",
  "detail":"Dec 22–24 were just booked.","request_id":"01J…","errors":[{"field":"check_in","message":"…"}] }
```
Codes: `VALIDATION_FAILED 422`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`, `DATES_UNAVAILABLE 409`, `QUOTE_EXPIRED 410`, `MIN_STAY_VIOLATION 422`, `IDEMPOTENCY_CONFLICT 409`, `RATE_LIMITED 429`, `PAYMENT_FAILED 402`.

## 5. Rate limits & quotas

Public search 60/min/IP; quote 30/min/IP; OTP request 5/hour per email + 20/hour/IP; booking create 10/min/user; webhooks exempt but signature verified. Headers: `RateLimit-Limit/Remaining/Reset`.

## 6. Versioning & compatibility

URI major version; additive changes only within a version; `Deprecation` + `Sunset` headers with ≥6 months notice; generated SDKs (TypeScript first) from the OpenAPI file; contract tests (Schemathesis) in CI.

## 7. Fee transparency (the product's selling point)

Every quote shows the all-in total with taxes and cleaning fee, and a `service_fee` line that is `0`. The API does not model or compare any competitor's fees.

## 8. Mexico specifics

Default currency MXN; optional USD presentment with the FX rate stored on the quote. Quote lines `tax_iva` and `tax_ish` come from effective-dated `tax_rates`. `POST /host/invoices` requests a CFDI 4.0 invoice with the guest's fiscal data. See [07-mexico-entity-and-stripe.md](./07-mexico-entity-and-stripe.md).
