# 01 — Reverse Engineering: atodamadre.properties

Method: passive, read-only HTTP GETs of public pages (home, two property pages, login, info form, privacy page, ES locale) on 2026-10-19. No authentication, no fuzzing, no writes.

## 1. Stack fingerprint

| Layer | Finding |
|---|---|
| CMS | Drupal 11 (`x-generator`), custom theme `atm_rentals`, Views for listing, Webform for contact |
| Runtime / host | PHP 8.3.35 (version leaked in `x-powered-by`), LiteSpeed, Hostinger shared hosting (hPanel) |
| i18n | EN default, ES at `/es/...`; the content body is Spanish even on the EN pages (untranslated) |
| Assets | Server-rendered HTML, aggregated CSS/JS, JPG images served from `/sites/default/files/YYYY-MM/` (no CDN, no responsive `srcset` observed, large originals) |
| Map | Google Maps embed iframe on property page |
| Brand | "ATM Rentals" (header) / "A Toda Madre Properties" (footer) — inconsistent naming |

## 2. Site map

| Route | Purpose |
|---|---|
| `/` , `/search-properties` | Listing grid (6 per page, 2 pages), filter "Available for" |
| `/es/search-properties` | Spanish listing |
| `/location/{slug}` | Property detail page (node) |
| `/form/location-information?return_path=…` | "Request more info" webform |
| `/user/login`, `/user/register`, `/user/password` | Drupal account pages, publicly reachable |
| `/aviso-de-privacidad` | Privacy notice (Mexican LFPDPPP requirement) |

Inventory seen: Vaiven del Mar FE, Vaiven del Mar LB (3BR/8 pax, $250), Solea 2/4/5 (1BR/4 pax, $73–80), Casa del Mar (6 pax, $145). Playa del Carmen, Quintana Roo.

## 3. Feature inventory (as-is)

**Discovery**
- Grid of property cards: photo, name, truncated description, "Rental fee" (single USD number), "Max occupancy"
- One filter: *Available for* = Any / Vacation rental / Long-term rental / Sale
- Pagination (6/page)
- Language toggle EN/ES

**Property detail**
- Photo carousel (Previous/Next, ~20 photos)
- Long free-text description
- "Rental fee per night" (flat USD) and "Max occupation"
- Amenity checklist (boolean + counted fields): beds, bathrooms, furnished, bedrooms, balcony/terrace, jacuzzi, equipped kitchen, washer, dryer, TV (count), wifi, A/C, parking (count), gym, elevator, garden, disabled access, pool (shared/private), distance to beach (km), extras (safe, security, beach-club card)
- Bed details (king/queen counts)
- Google Map embed + address
- "If you require more info, click here" → contact webform (first, last, email, message, property)

**Accounts / admin**
- Drupal login, register, password reset (no visible user-facing purpose — no account dashboard)
- Content is managed by staff in Drupal admin (inferred)

**Compliance**
- Privacy notice page

## 4. What the site does NOT do (the gaps)

| Gap | Impact |
|---|---|
| **No availability calendar, no date search, no guest count filter** | Guest cannot know if a place is free; every inquiry is manual |
| **No booking, no payment** | All conversion happens off-site (email/WhatsApp), leaking leads |
| **Single flat price** | No seasonality, weekend pricing, min-stay, cleaning fee, taxes, discounts |
| **No total price breakdown** | Guests dislike surprises; hurts trust |
| No reviews/ratings, no host identity/trust signals | Guests default back to Airbnb |
| No map search, no price/bedroom/amenity filters, no sort | Weak discovery |
| No guest/host dashboards, no messaging, no check-in instructions, no documents/ID/contract flow | Operations are manual |
| No availability feed for staff or owners (calendar of bookings, blocks) | Double-booking risk with manual WhatsApp bookings |
| No SEO structure (schema.org `LodgingBusiness`/`Offer`, hreflang, sitemap—`/sitemap.xml` is 404) | Poor organic discovery |
| Contact form with no stated spam control or SLA | Lead loss |
| Mixed-language content, inconsistent brand | Confusing |
| Heavy unoptimised images | Slow mobile LCP |
| Cancellation/house-rules/terms not shown | No policy transparency |

## 5. Data model implied by the site

`Location(node)`: title, slug, body, available_for[], rental_fee_usd, max_occupancy, beds, baths, bedrooms, bed_types{king,queen}, ~20 amenity flags/counts, distance_to_beach_km, extras[], images[], address/map.
`ContactRequest(webform submission)`: first, last, email, message, location, available_for.
`User`: Drupal default.

This is the seed for the new schema in `03-backend.md` and `schema.sql`.
