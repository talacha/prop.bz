# 06 — Security Audit

Two parts: (A) a passive review of the existing public site; (B) a threat-model-based design audit of the proposed platform. Part A used only ordinary GET requests to public pages. No exploitation, authentication attempts, form submissions, or scanning was performed. Part B is a design review; the platform is not yet built, so findings are requirements and controls, not code defects.

## A. Existing site (passive observations, 2026-10-19)

| # | Observation | Severity | Recommendation |
|---|---|---|---|
| A1 | `X-Powered-By: PHP/8.3.35` and `X-Generator: Drupal 11` disclosed | Low | Remove headers; version disclosure speeds up targeted attacks |
| A2 | No `Strict-Transport-Security`, no real `Content-Security-Policy` (only `upgrade-insecure-requests`), no `Referrer-Policy`, no `Permissions-Policy` | Medium | Add HSTS (preload after testing), CSP, referrer and permissions policies |
| A3 | `/user/login` and `/user/register` publicly reachable, with a "Create new account" tab, though the site has no user-facing account features | Medium | Disable public registration (Drupal: "Administrators only"); move admin login off the public path or restrict by IP/SSO; add 2FA and login throttling for staff |
| A4 | Contact webform (`/form/location-information`) with a `return_path` query parameter | Medium | Validate `return_path` to same-site relative paths only (open-redirect risk), add CAPTCHA/honeypot and rate limiting |
| A5 | `/sitemap.xml` returns a 404 page with HTTP 404; no confirmed sitemap | Info | Not a security issue; SEO gap |
| A6 | Shared hosting (Hostinger/LiteSpeed): noisy neighbours, limited WAF/isolation control | Low–Medium | Move to managed hosting with WAF; keep Drupal core/modules patched |
| A7 | Privacy notice exists (LFPDPPP) but the contact form does not link consent to it | Low | Add explicit consent checkbox and link |
| A8 | Positive: HTTPS everywhere, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, no card data handled | — | Keep |

Not tested (out of scope for passive review): Drupal core/module patch level, admin panel, file upload handling, user enumeration, injection.

## B. Proposed platform: threat model

Assets: guest PII (names, emails, phones, optionally IDs), payment flows, host payout accounts, door codes/addresses, availability integrity, reputation (reviews).
Actors: anonymous bot, malicious guest, malicious host, competitor scraper, compromised staff account, insider, supply-chain attacker.
Trust boundaries: browser ↔ CDN/WAF ↔ API ↔ DB/Redis/object store; API ↔ Stripe/WhatsApp/email; API ↔ PAC (CFDI).

### Findings and required controls (OWASP API Top 10 2023 mapped)

| ID | Threat | Risk | Control (must ship in MVP unless marked) |
|---|---|---|---|
| B1 | **BOLA/IDOR**: guest reads another's booking by guessing IDs (API1) | High | UUIDv4/ULID IDs, central `can()` policy on every handler, authz matrix tests per endpoint, Postgres RLS for host-scoped tables, itinerary requires signed token or session bound to booking email |
| B2 | **Broken auth**: OTP brute force, enumeration, token theft (API2) | High | OTP 6 digits hashed, 10 min TTL, 5 attempts then lock, constant 202 response, per-email and per-IP limits, Turnstile on request, EdDSA JWT 15 min, refresh rotation with reuse detection, HttpOnly SameSite cookies, WebAuthn/TOTP mandatory for host/staff/admin |
| B3 | **Price tampering** (client sets price) (API3/API6) | High | Server-computed signed quotes; booking recomputes and compares; Stripe amount derived server-side only |
| B4 | **Double-booking via race or sync lag** | High | DB exclusion constraint, serializable transaction, concurrency test; no external sync, so single source of truth |
| B5 | **Payment fraud / card testing / chargebacks** | High | Stripe Radar, 3DS where required, Turnstile and velocity limits on booking creation, block repeated failed intents per IP/email, evidence pack for disputes, deposit rules for high-risk stays |
| B6 | **Webhook forgery/replay** (Stripe, inbound) | High | Verify `Stripe-Signature` on raw body, timestamp tolerance, dedupe on event id, idempotent handlers, never trust redirect as proof of payment |
| B7 | **SSRF** through any user-supplied URL (host webhook endpoints, if shipped) | Medium | HTTPS only, resolve and pin DNS, deny private/loopback/link-local/metadata ranges, size/time limits, isolated egress worker. No inbound calendar fetching exists in the MVP |
| B8 | **Mass assignment / excessive data exposure** (API3) | Medium | Strict zod schemas (`.strict()`), explicit response DTOs, never serialize ORM entities; exact address/door code only after confirmed payment and time-gated |
| B9 | **Injection** (SQL, header, template) | Medium | Parameterized queries only, no string-built SQL, output encoding in React, email templates auto-escaped, CSP |
| B10 | **XSS / content injection** in messages, reviews, host descriptions | Medium | Plain text or sanitized subset (DOMPurify server-side allow-list), CSP with nonces, `HttpOnly` cookies |
| B11 | **CSRF** on cookie-authenticated routes | Medium | SameSite=Lax + double-submit/origin check on state-changing requests, no GET side effects |
| B12 | **Rate-limit / DoS / scraping** (API4) | Medium | Cloudflare WAF and bot management, per-route limits (see API doc), pagination caps, cached availability, request-size limits, price-scraping tolerance by serving the same public data as the UI |
| B13 | **File upload abuse** (photos, ID docs) | Medium | Direct-to-bucket signed URLs with content-type and size constraints, magic-byte check, re-encode images in worker (strips EXIF/GPS and polyglots), private bucket for IDs, malware scan for documents |
| B14 | **Secrets & key management** | High | Secret manager, no secrets in git/images, separate Stripe keys per env, restricted API keys, rotation runbook, secret scanning in CI |
| B15 | **PII leakage / privacy non-compliance** | High | Field-level encryption for IDs/door codes, TLS 1.2+, encrypted backups, retention schedule, LFPDPPP ARCO endpoints, DPA with processors, log scrubbing (no PII/tokens in logs) |
| B16 | **Insider/staff abuse** | Medium | Least-privilege roles, admin actions in append-only `audit_log`, break-glass access with alert, staff SSO + hardware keys |
| B17 | **Supply chain** | Medium | Lockfiles, Dependabot/Renovate, `npm audit` and SCA gate, pinned CI actions by SHA, SBOM, minimal base images, no postinstall scripts from untrusted packages |
| B18 | **Fake reviews / review extortion** | Low–Medium | Reviews only from completed paid bookings, double-blind window, host response allowed, moderation queue |
| B19 | **Phishing via lookalike domains / spoofed booking emails** | Medium | SPF, DKIM, DMARC `p=reject`, BIMI optional, never ask for payment outside the platform, booking emails show reference + link to the real domain; warn guests in itinerary |
| B20 | **Open redirect / return_path** (carried over from legacy) | Low | No user-controlled redirect targets; allow-list |
| B21 | **Unsafe error handling / info leaks** | Low | RFC 9457 errors with request id only; no stack traces; generic 401/404 for unauthorized objects |
| B22 | **Availability of critical dependencies (Stripe, email)** | Medium | Outbox + retries, dead-letter queue, status page, degraded mode (inquiry form still works) |

### Security headers (production target)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-…' https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; connect-src 'self' https://api.stripe.com; img-src 'self' data: https://cdn.example.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(self "https://js.stripe.com")
X-Content-Type-Options: nosniff
Cross-Origin-Opener-Policy: same-origin
```

### Compliance notes

- **PCI DSS**: SAQ A scope by using Stripe-hosted fields; never log or store PAN/CVV; serve payment pages over strict CSP.
- **Mexico LFPDPPP**: privacy notice (aviso de privacidad integral), consent, ARCO requests, breach notification. **GDPR** for EU guests. Have counsel review.
- **Tax/short-term rental regulation**: collect and remit IVA/ISH and any local registration requirements; keep invoices (CFDI). Confirm with an accountant and local counsel.

### Security testing plan

1. Design review sign-off before build (this document).
2. CI gates: SAST (Semgrep/CodeQL), SCA, secret scan, container scan, OpenAPI fuzzing (Schemathesis), authz matrix tests.
3. Pre-launch: independent penetration test focused on B1, B2, B3, B6, B7; Stripe test-mode abuse scenarios; load/DoS test.
4. Ongoing: bug-bounty or responsible-disclosure page (`/.well-known/security.txt`), quarterly dependency and access review, annual pen test, incident response runbook with 72-hour breach decision tree.

### Residual risks

Direct bookings carry no marketplace guest-protection program; mitigate with clear policies, ID verification options, damage deposit via card hold, and optional insurance. Delayed payment methods (OXXO/SPEI) lengthen holds, so cap how many dates one unpaid voucher can block.

## Status after the hardening pass (2026-10-20)

Applies to the implemented website (not the full booking backend described above).

| Finding | Status |
|---|---|
| B1 object-level access, B2 auth, B3 price tampering, B5 payments, B6 Stripe webhooks | Not applicable yet: no accounts, payments or webhooks exist in the demo |
| B8 excessive data exposure | **Fixed:** the `address` field was removed from the public dataset; the site never queries private fields |
| B9 injection / B10 XSS | Inputs validated with zod; React escapes output; JSON-LD escapes `<`; **CSP enforced** |
| B11 CSRF | Request endpoint accepts only same-origin JSON POSTs |
| B12 rate limits / DoS | **Done:** app limiter plus a Vercel Firewall rate-limit rule on `/api/requests` |
| B13 uploads | No uploads on the site |
| B14 secrets | Revalidation secret rotated and stored as a sensitive Vercel variable |
| B15 privacy | Demo privacy notice published; nothing is stored; no analytics or tracking cookies |
| B19 phishing / spoofing | Open: email domain has registrar forwarding only (SPF), no DMARC; revisit when sending email |
| B20 open redirect | None: no user-controlled redirects |
| Legacy A2 headers | **Fixed** on the new site (CSP, HSTS, COOP, referrer, permissions) |
