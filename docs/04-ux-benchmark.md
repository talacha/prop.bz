# 04 — UX Benchmark & Click-Reduction Strategy

Airbnb, Booking.com and Vrbo are used here only as industry UX benchmarks. This project has no integration with them, and the product never references them in copy or API.

Click counts below are from the standard happy path of a first-time guest on desktop who knows destination, dates and party size, and starts at the home page. They are approximate, based on common patterns of each product, and should be re-verified with a timed walkthrough before they're quoted externally.

## 1. Comparison

| | Airbnb | Booking.com | Vrbo | Typical PMS direct site (Lodgify/Hostaway/Guesty) | Legacy atodamadre.properties | **New (target)** |
|---|---|---|---|---|---|---|
| Discovery | Best-in-class: map + grid split, category icons, flexible dates, wishlists | Filter-heavy, list-first, urgency badges | Family-oriented filters, whole-home focus | Basic grid, often no map | 6-card grid, 1 filter, no dates | Map + grid for a small portfolio, dates/guests pre-applied to cards |
| Price clarity | Total-price toggle (regulatory driven), fees revealed late in flow | Strong "total price" now, taxes late | Fees at checkout | Often shows only nightly | Single flat nightly, no total | **Total for stay shown on every card; full breakdown before any login** |
| Availability | Calendar in listing, min-stay hints | Calendar | Calendar | Calendar, sometimes lagging | None | Live calendar with per-night price, min-stay, closed arrival shown inline |
| Listing page | Photo grid, sticky reserve card, reviews, host profile | Dense, many upsells | Similar to Airbnb | Template-driven, slow | Carousel, text wall | Photo grid, sticky price card, amenity chips, reviews, map with fuzzed pin |
| Auth to book | Account required (social/phone/email) | Account optional | Account required | Usually guest checkout | n/a | **Guest checkout; account created implicitly by email OTP after payment** |
| Checkout | Multi-step page: trip, pay method, message host, review, confirm | Multi-step: details → extras → pay | Multi-step | 2–3 steps | n/a | **Single page, one decision: pay** |
| Payment | Cards, wallets, local methods, pay-later options | Cards, pay at property | Cards | Cards via Stripe, sometimes bank transfer | n/a | Apple Pay / Google Pay / card / Link, MXN or USD, optional deposit split |
| After booking | Itinerary, messaging, check-in guide | Confirmation email | Itinerary | Email | n/a | Magic-link itinerary, WhatsApp + email, add-to-calendar, check-in guide |
| Trust | Reviews, Superhost, AirCover | Reviews, verified stays | Reviews, Premier Host | Weak | None | Reviews, named host, verified-stay badges, clear policy before pay |
| Fees to guest (indicative) | ~14% service fee | Varies by property | ~6–12% | 0 | 0 (no booking) | **0 platform fee to guest (the entity pays only Stripe processing)** |

### What to borrow
- **Airbnb**: sticky reserve card, photo-first listing, total-price toggle, wishlists, double-blind reviews.
- **Booking.com**: free-cancel-until messaging and clear policy near the CTA, "pay at property" option, strong filter facets.
- **Vrbo**: whole-home clarity and family filters (bedrooms, bed types, pool).
- **Direct-site best practice (Lodgify)**: guest checkout, no account wall, deposit/balance schedule.

### What to avoid
- Fees appearing for the first time on the last step (erodes trust, regulators now penalise it).
- Re-entering dates/guests on the listing page after searching.
- Forced account creation and password rules before payment.
- Multi-screen checkout wizards for a 1-property, 1-decision purchase.
- Urgency dark patterns ("3 people looking!") — the portfolio is small; use only true scarcity ("2 nights left in Dec").

## 2. Click budget

Counting rule: one click/tap = one discrete interaction; typing counts as zero if the browser autofills, one if it does not.

| Step | Airbnb (est.) | New design |
|---|---|---|
| Open app | 0 | 0 |
| Destination | 2–3 (open, type, choose) | **0** (single-region portfolio, preselected) |
| Dates | 3–4 (open, start, end, confirm) | 2 (start, end on one inline range calendar) |
| Guests | 2–3 (open, +/+, close) | 1 (stepper popover, defaults to 2) |
| Search submit | 1 | **0** (results update live) |
| Open listing | 1 | 1 |
| Re-confirm dates/guests on listing | 0–2 | **0** (carried through URL) |
| Reserve | 1 | 1 |
| Sign up / log in | 2–4 | **0** (guest checkout) |
| Review trip / choose payment / add message / confirm | 4–6 | **0** (single page) |
| Pay | 1–2 | 1 (wallet) |
| **Total** | **≈ 17–27** | **≈ 6** |

### Fast paths
1. **Deep link (shared by host on WhatsApp/Instagram):** `/p/solea-5?in=2026-12-20&out=2026-12-27&g=2` lands on the listing with dates applied and the total price visible → **Reserve (1) → Pay with wallet (1) = 2 clicks.**
2. **Returning guest:** saved details + Link/Apple Pay one-tap → Reserve (1) → Pay (1) = **2 clicks after choosing dates.**
3. **Home search with 6 properties:** the home page shows availability for chosen dates directly on each card; "Book" on a card opens the checkout sheet in place, skipping the listing page for repeat guests → **dates (2) + guests (1) + Book (1) + Pay (1) = 5.**

### Mechanisms that remove clicks
| Mechanism | Saves |
|---|---|
| Dates + guests live in the URL and one global context; every card/price reflects them | re-entry, search button |
| Range calendar shows per-night price and blocks invalid min-stay inline, so no failed-search loops | 1–3 |
| Quote prefetched on date selection (API `POST /quotes`, <150 ms) so the price card is already there | wait + a click |
| One-page checkout: contact, payment element, policy checkbox merged into the pay button text ("Pay $560 — I agree to the terms") | 4–6 |
| Wallet payments carry name, email, phone, billing address | typing |
| No account wall; passwordless OTP offered *after* payment to claim the itinerary | 2–4 |
| Phone number via country-aware input with auto-detected country | corrections |
| Hold dates for 15 min at "Reserve" so nothing is lost while paying | abandonment |
| Message-the-host is optional and collapsed, never a required step | 1 |
| WhatsApp click-to-chat as an alternative path for guests who prefer it (this market uses it heavily) | support friction |

### Measurement
Instrument funnel events (`dates_selected`, `quote_shown`, `reserve_clicked`, `checkout_viewed`, `payment_submitted`, `booking_confirmed`) with a privacy-friendly analytics tool. Targets: median ≤ 6 interactions, listing→paid conversion ≥ 3%, checkout abandonment ≤ 35%, time-to-book ≤ 90 s for deep-link traffic. Run a moderated test with 5 users before launch and an A/B on one-page vs two-step checkout after.
