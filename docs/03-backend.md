# 03 — Backend Design

## 1. Shape: modular monolith first

One deployable, strict module boundaries, one Postgres. The portfolio is small; microservices would add cost with no benefit. Modules can be split out later because they talk through interfaces and the outbox.

```
            Cloudflare (CDN, WAF, bot mgmt, Turnstile)
                         │
        ┌────────────────┴───────────────┐
   Next.js web (SSR/ISR)            API (Node 22, TypeScript, Fastify)
   static assets, images             ├─ auth        ├─ catalog     ├─ pricing/quotes
                                     ├─ availability├─ bookings    ├─ payments (Stripe)
                                     ├─ messaging   ├─ reviews     ├─ calendar feed (.ics export)
                                     ├─ notifications            └─ host/admin
                         ┌───────────┼───────────────┐
                  PostgreSQL 16   Redis 7        S3-compatible object store
                  (+PostGIS)   (rate limit, cache,  (photos, docs; signed URLs)
                                BullMQ queues)
                         │
                  Worker process (same codebase): outbox relay, hold expiry, CFDI issuing,
                  balance charges, reminders, review windows, payouts reconciliation
```

## 2. Stack choices and why

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript end to end | Shared types with the front end, generated from OpenAPI |
| HTTP | Fastify + zod schemas | Fast, schema-validated at the edge |
| DB | PostgreSQL 16, PostGIS, `btree_gist` | Exclusion constraint prevents double-booking at the DB level; range types model stays |
| Migrations | Atlas or node-pg-migrate, reviewed in CI | Forward-only |
| Queue/jobs | BullMQ on Redis, plus a transactional outbox | At-least-once events without dual-write bugs |
| Payments | Stripe Mexico: PaymentIntents + Payment Element/Express Checkout, direct charges on the entity's account, cards with MSI, Apple/Google Pay, Link, OXXO and SPEI | PCI SAQ-A scope (card data never touches us); Connect deferred (single entity) |
| Email/WhatsApp/SMS | Postmark or SES; WhatsApp Business Cloud API; Twilio fallback | Where guests actually respond |
| Search | Postgres + PostGIS for MVP; Typesense/Meilisearch only if listings exceed ~1k | Don't add infrastructure early |
| Images | Direct upload to object store → worker generates AVIF/WebP at 5 widths + blurhash; served via CDN | Fixes the legacy site's heavy originals |
| Hosting | Container platform (Railway/Fly/Render/ECS) with managed Postgres and PITR backups, region near Mexico/US-East | Simple ops |
| Observability | OpenTelemetry → traces/logs/metrics; Sentry; uptime checks; Stripe webhook failure alerts | |
| Secrets | Platform secret manager; no secrets in repo/images | |

## 3. Correctness-critical logic

### 3.1 No double-booking (three layers)
1. **Database**: `EXCLUDE USING gist (property_id WITH =, stay WITH &&) WHERE status IN (active)` on `bookings`; same on blocks via a check in the booking transaction.
2. **Transaction**: booking creation runs `SERIALIZABLE` (or `SELECT … FOR UPDATE` on the property row), checks `calendar_blocks`, inserts the booking; on `23P01` (exclusion violation) return `409 DATES_UNAVAILABLE`.
3. **Single source of truth**: no marketplace sync exists, so there is no cross-channel lag. Offline bookings entered by staff pass through the same transaction and constraint.

### 3.2 Pricing engine (pure function, heavily unit-tested)
`price(property, check_in, check_out, guests, promo, at) → Quote` computes per night: override > season > weekend > base; then length-of-stay discount, cleaning fee, extra-guest fee, promo, taxes from `tax_rates` effective on the stay date; rounding rules documented (half-even, per line). Output is signed with HMAC (`quote_id` = payload + signature + expiry) so the booking endpoint can trust it without a DB row, and re-validates availability and rules.

### 3.3 Hold expiry
`pending_payment` bookings carry `hold_expires_at`. A worker (every minute, `FOR UPDATE SKIP LOCKED`) moves expired holds to `expired`, freeing the range. The Stripe PaymentIntent is canceled.

### 3.4 Payments
- PaymentIntent per amount due, `metadata.booking_id`, idempotency key = booking id + attempt.
- **Source of truth is the webhook** (`payment_intent.succeeded`), not the client redirect. Handler: verify signature → insert `stripe_events(id)` (unique, dedupes) → transition booking in one transaction → write outbox event.
- Edge case: payment succeeds after the hold expired → if range is still free, re-confirm; otherwise auto-refund and apologize (tested path).
- Single Mexican entity: direct charges settle to its Stripe account and CLABE. Connect and application fees are deferred until other owners are onboarded.
- Refunds computed from the immutable `quote_snapshot.cancellation_policy`, not the current policy.

### 3.5 Taxes & invoicing (Mexico)
Tax rates are data, not code (`tax_rates`), effective-dated. Likely lines: IVA 16% and the state lodging tax (ISH) where applicable — **confirm current rates and obligations with a Mexican accountant before launch**. CFDI 4.0 invoicing through a PAC provider is in the MVP (see doc 07). The visitor tax (Visitax) is collected by the state, not the host; link guests to it in the itinerary rather than collecting it.

### 3.6 Calendar feed

Optional read-only `.ics` export for the owner, behind a long random token (hashed at rest, revocable). No inbound fetching of external URLs in the MVP.

### 3.7 Notifications
Event → template → channel preference. Booking confirmed (email + WhatsApp), 7 days before (arrival info), 48 h before (door codes released), day after check-out (review request). All templated in ES/EN.

## 4. Auth design

- Guests: email OTP (6 digits, 10 min, 5 attempts, stored hashed) or magic link; no passwords for guests. Hosts/staff: OTP + TOTP/WebAuthn passkey (required for staff/admin).
- Access JWT (EdDSA, 15 min, `kid` rotation via JWKS), refresh token rotation with family revocation on reuse. Web uses `HttpOnly; Secure; SameSite=Lax` cookies for refresh; API clients use bearer.
- Authorization: central policy layer (`can(user, action, resource)`), every handler loads the resource then authorizes — object-level checks tested per endpoint. Postgres RLS as defense-in-depth for host-scoped tables.

## 5. Data lifecycle & privacy

- PII: names, emails, phones, optional ID docs. Field-level encryption (envelope, KMS) for ID documents and door codes; DB encryption at rest; TLS everywhere.
- Retention: financial records per Mexican fiscal rules (5 years; confirm), messages 2 years, OTP/logs 30–90 days. Deletion endpoint anonymises user rows while preserving ledger rows.
- Compliance: LFPDPPP (Mexico) privacy notice and ARCO rights endpoints; GDPR-ready for EU guests; cookie consent only if non-essential trackers are used.

## 6. Environments, CI/CD, testing

- Environments: local (docker-compose: Postgres, Redis, MinIO, Stripe CLI), staging (Stripe test mode), production.
- CI: typecheck, lint, unit, integration (Testcontainers Postgres), OpenAPI lint + Schemathesis, SAST (CodeQL/Semgrep), dependency audit + Dependabot, secret scan, container scan; deploy on tag with migrations as a separate gated step.
- Tests that matter most: pricing property tests (invariants: total = sum of lines, monotonic in nights), concurrency test (100 parallel bookings for the same dates → exactly 1 succeeds), webhook replay/out-of-order, hold-expiry-then-pay, refund policy table tests, authz matrix.
- Reliability targets: API p95 < 300 ms (quote < 150 ms), 99.9% monthly, RPO 5 min (PITR), RTO 1 h. Load test at 20× expected peak before launch.

## 7. Cost sketch (MVP, indicative)

Hosting + managed Postgres + Redis ≈ US$60–150/mo; Cloudflare free/pro; email/WhatsApp usage-based; Stripe ≈ 3.6% + fixed per card in Mexico (verify current pricing). The only per-booking cost is Stripe processing (confirm current Mexican pricing, including MSI and OXXO/SPEI fees); there are no marketplace commissions.
