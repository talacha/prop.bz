# A Toda Madre Direct — Plan

Goal: a direct-booking platform for the A Toda Madre Properties portfolio in Playa del Carmen that lets guests book and pay directly, with no marketplace fees or account friction, backed by a complete API. The operator is a Mexican legal entity, payments run on Stripe, and no third-party marketplace is integrated.

## Documents

| Doc | Contents |
|---|---|
| [01-reverse-engineering.md](./01-reverse-engineering.md) | Stack fingerprint, site map, feature inventory, gaps of atodamadre.properties |
| [02-api-design.md](./02-api-design.md) + [openapi.yaml](./openapi.yaml) | REST API, flows, state machine, errors, limits |
| [03-backend.md](./03-backend.md) + [schema.sql](./schema.sql) | Architecture, data model, booking/payment/sync correctness |
| [04-ux-benchmark.md](./04-ux-benchmark.md) | Airbnb/Booking/Vrbo/direct-site comparison, click budget |
| [05-frontend.md](./05-frontend.md) | IA, screens, design system, a11y, SEO |
| [06-security-audit.md](./06-security-audit.md) | Passive audit of the old site and threat model of the new one |
| [07-mexico-entity-and-stripe.md](./07-mexico-entity-and-stripe.md) | Mexican entity, Stripe Mexico, IVA/ISH, CFDI, compliance assumptions |
| [../frontend/prototype/index.html](../frontend/prototype/index.html) | Interactive prototype (published as an Artifact) |

## Summary of the legacy site

Drupal 11 on shared hosting: a 6-property catalog with one filter, a flat nightly price, amenity checklist and a contact form. It has no availability, no total pricing, no booking, no payments and no calendar sync. Every sale happens off-site.

## Product thesis

- Guests pay no service fee, and the quote shows the all-in total (taxes and cleaning included) up front.
- The entity keeps its revenue: no marketplace commission, only Stripe processing fees.
- Booking takes about 6 interactions instead of about 17–27 (see UX doc), 2 from a shared deep link.
- Airbnb and similar platforms are competitors and UX benchmarks only; nothing in the system integrates with them.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Architecture | Modular monolith, Postgres, Redis, worker | Small portfolio; simplest thing that is correct |
| Double-booking | Postgres exclusion constraint + serializable txn | Correct under concurrency regardless of app bugs |
| Pricing | Server-signed quotes | Shown price equals charged price; prevents tampering |
| Payments | Stripe Mexico direct charges (cards + MSI, wallets, OXXO, SPEI); Connect deferred | Low PCI scope; single Mexican entity |
| Auth | Guest passwordless OTP; host/staff passkeys | No password database for guests; strong auth where it matters |
| Front end | Next.js, one-page checkout, guest checkout | Fewest clicks, SEO, speed |
| Calendar | Single source of truth in our DB, optional read-only `.ics` export | No external sync needed; removes a class of bugs and SSRF risk |

## Roadmap

| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| 0. Discovery | 1–2 | Entity documents, Stripe MX account verified, PAC provider chosen, IVA/ISH/RNT confirmed by contador and counsel, T&C and cancellation policy in Spanish, brand | Signed-off policies; Stripe live-mode eligibility confirmed |
| 1. Foundations | 3–5 | Repo, CI/CD, infra, auth, catalog, photo pipeline, content migration from Drupal (6 properties, amenities, photos) | Properties browsable in staging |
| 2. Booking core | 6–9 | Availability, pricing engine, quotes, bookings with holds, Stripe payments (cards, MSI, OXXO, SPEI) and webhooks, CFDI, emails, concurrency tests | End-to-end test booking in Stripe test mode |
| 3. Guest experience | 8–11 | Search/home, property page, one-page checkout, trip page, ES/EN, SEO | Lighthouse ≥ 90 mobile; usability test with 5 users |
| 4. Host tools | 10–13 | Host console, calendar, pricing rules, CFDI invoicing, payout reports, messaging, WhatsApp | Staff run a week of real operations in staging |
| 5. Hardening | 13–14 | Pen test, load test, backups/restore drill, runbooks, legal pages, monitoring | Findings high/critical closed |
| 6. Launch | 15 | Soft launch to repeat guests and WhatsApp contacts | First 10 direct bookings |
| 7. Growth | 16+ | Reviews, promo codes, dynamic pricing suggestions, long-term/sale listings | Direct share of bookings ≥ 30% |

## Team (minimum)

1 full-stack lead, 1 front-end engineer, 0.5 designer, 0.5 ops/QA, part-time accountant and legal counsel. Alternatively one strong full-stack engineer over roughly 5–6 months.

## Success metrics

Direct-booking share, listing-to-paid conversion (≥ 3%), median clicks to book (≤ 6), checkout abandonment (≤ 35%), double-bookings (0), payment success rate (≥ 97%), p95 API latency (< 300 ms), host fee savings per month, guest NPS.

## Top risks

| Risk | Mitigation |
|---|---|
| Low traffic without a marketplace's built-in demand | Launch to existing guests/WhatsApp, SEO, Google Vacation Rentals feed, referral codes, local partnerships |
| Double-booking from manual/offline bookings | DB constraints; all bookings (staff-entered too) go through one transaction |
| Tax / licensing / Stripe eligibility mistakes | Phase 0 sign-off with contador and counsel before any money moves; see doc 07 |
| Fraud and chargebacks | Radar, 3DS, deposits, clear policy, evidence automation |
| No marketplace guest protection | Policies, ID checks, card-hold deposits, optional insurance partner |
| Scope creep | Hold the MVP to phases 1–4; defer long-term/sale listings and dynamic pricing |

## Open questions for the owner

1. Prices authored in USD (as on the current site) or MXN? Show a toggle?
2. Payment terms: full up front, deposit and balance, or pay on arrival? Offer MSI installments?
3. Cancellation policy and security-deposit preference?
4. Does one entity own all six units, or are some owned by third parties (affects Stripe Connect)?
5. Is the platform for this portfolio only, or a multi-owner product to resell later?
6. Who handles guest messaging and check-in today (WhatsApp)?

(Resolved: Mexican legal entity, Stripe, and no marketplace integration.)

## Next steps

1. Review the prototype and UX doc, and pick the checkout variant to A/B.
2. Answer the open questions above.
3. Approve the stack and start Phase 0.
