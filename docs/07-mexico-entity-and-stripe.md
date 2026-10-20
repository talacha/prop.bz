# 07 — Mexican Entity & Stripe Operating Model

Assumptions confirmed by the owner:

1. The business is a **Mexican legal entity** (typically an S.A. de C.V. or S. de R.L. de C.V., or a persona física con actividad empresarial) that owns or operates the properties and is the **merchant of record**.
2. Payments run on **Stripe** (Mexico).
3. **Airbnb, Booking.com and Vrbo are competitors only.** There is no integration, listing, import, or data exchange with them. They appear in this project solely as UX benchmarks.

Everything below that touches tax, licensing or Stripe terms is a working assumption to be confirmed by a Mexican *contador* and *abogado* in Phase 0. Rates and rules change.

## 1. Consequences for the architecture

| Topic | Decision |
|---|---|
| Money flow | One Stripe account in the entity's name. Guests pay with **direct charges**; Stripe settles to the entity's Mexican bank account (CLABE). No marketplace, no platform fee, no split payouts. |
| Stripe Connect | **Not in the MVP.** Add it only if the product is later opened to other property owners. The `hosts` table and `/host/payout-account` endpoint are kept in the model but dormant (single host row). |
| Calendar | Single source of truth in our database. **No third-party marketplace sync.** Staff-entered offline bookings (WhatsApp, walk-ins) use the same exclusion constraint. An optional read-only `.ics` export lets the owner view bookings in Google/Apple Calendar. |
| Currency | **MXN is the default and settlement currency.** USD presentment is optional (guests from the US/Canada); Stripe converts and settles in MXN. Quote stores the currency shown and the FX rate used. Decide in Phase 0 whether prices are authored in USD (as on the legacy site) or MXN. |
| Language | es-MX default, en-US second. |
| Fee messaging | "No service fee" and "total price, taxes included". No comparison with any competitor in product copy or API. |

## 2. Stripe Mexico setup

- Create the Stripe account under the entity (RFC, acta constitutiva, representante legal ID, CLABE bank account).
- **Payment methods** to enable (confirm availability on the account): cards (Visa/Mastercard/Amex) with 3D Secure, Apple Pay, Google Pay, Link, **OXXO** (voucher, delayed confirmation) and **SPEI** bank transfer (also delayed). Consider **meses sin intereses (MSI)** installments for domestic credit cards, a strong conversion lever in Mexico.
- **Delayed methods (OXXO/SPEI)** change the hold logic: the hold window extends to the voucher expiry (e.g. 24-48 h) only for those methods, and the booking confirms on `payment_intent.succeeded` as usual. Card payments keep the 15-minute hold.
- Use **PaymentIntents + Payment Element/Express Checkout Element**, webhooks as the source of truth (see backend doc §3.4), Radar rules for card testing, restricted API keys per service, separate test and live keys.
- **Disputes**: store the immutable quote snapshot, policy acceptance timestamp/IP, messages, check-in evidence for automatic evidence submission.
- Reconciliation: daily job comparing `payments` with Stripe balance transactions and payouts; export for the accountant.

## 3. Tax and invoicing (Mexico)

| Item | Working assumption | Action |
|---|---|---|
| **IVA** | 16% on lodging services; effective-dated rate in `tax_rates` | Confirm rate and any special treatment with the contador |
| **ISH** (state lodging tax) | Quintana Roo levies a percentage on lodging; the legacy-site region is Playa del Carmen, so seed `MX-ROO-ISH` (the prototype uses 3% as a placeholder) | Confirm current rate, who collects, and filing cadence |
| **Visitax** | Paid directly by foreign visitors to the state; not collected by the host | Link from the itinerary; do not collect |
| **CFDI 4.0** | The entity must issue electronic invoices on request (and for its own books) | Integrate a PAC provider (e.g. Facturapi, Facturama, SW Sapien; evaluate); collect guest RFC, razón social, régimen fiscal, código postal, uso CFDI at or after checkout; invoice within the legal window |
| **Registro Nacional de Turismo (RNT) / local permits** | Short-term rentals may need registration and local compliance | Counsel to confirm; display registration number on listings if required |
| **PROFECO** (consumer protection) | Total price including taxes must be clear; terms must be accessible; cancellation terms disclosed before payment | Already reflected in the UX: total up front, policy on the checkout page; have counsel review the *términos y condiciones* |
| **Aviso de privacidad (LFPDPPP)** | Integral privacy notice, consent, ARCO rights | Replace the legacy page; link at every data-collection point |
| **Retention** | Fiscal records generally kept for 5 years | Confirm and encode in the retention schedule |

Data model additions: `hosts.rfc`, `hosts.tax_regime`, `hosts.fiscal_postal_code` (the entity), `invoices (booking_id, cfdi_uuid, xml_key, pdf_key, status)`, `guest_fiscal_profiles (rfc, razon_social, regimen, cp, uso_cfdi)`.

## 4. Impact on the plan

- Phase 0 now includes: entity documents ready, Stripe MX account verified, PAC provider chosen, tax rates confirmed in writing, RNT/permit check, T&C and cancellation policy drafted in Spanish.
- CFDI moves from "Growth" to **MVP** (guests in Mexico routinely ask for invoices; it is also a legal obligation of the entity).
- iCal import/SSRF-guarded fetching is **removed** from the MVP scope, which also removes threat B7 (iCal SSRF) from the audit.
- Stripe Connect, multi-owner payouts and platform commission are **deferred** until/unless other owners are onboarded.
- SPEI/OXXO and MSI move from "Growth" into the late MVP because they matter for the Mexican market.
