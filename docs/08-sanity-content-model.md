# 08 — Sanity Content Model and Website

Sanity project `1npz4e5x`, dataset `production`. The Studio lives in `studio/`, the Next.js site in `web/`.

## 1. What lives where

| Data | System | Why |
|---|---|---|
| Listings, photos, copy (ES/EN), amenities, personas, section pages, site settings, SEO | **Sanity** | Edited by the team, versioned, served from a CDN |
| Availability, quotes, bookings, tours, viewings, applications, payments, invoices, reviews, messages | **Booking API + Postgres** (docs 02, 03) | Transactional, must be consistent, contains personal data |

Prices in Sanity are *list prices* (nightly rate, monthly rent, asking price). The booking API is the source of truth for quotes. Until it exists, the site shows a clearly labelled estimate and `/api/requests` runs in demo mode.

## 2. Document types

| Type | Purpose |
|---|---|
| `property` | One document per listing. `listingType` is `vacation`, `rental` (1 to 11 month lease) or `sale`, and decides which terms object applies |
| `listingSection` | The three top-level pages (one per type): nav label, title, tagline, primary CTA verb, ordered persona shortcuts, SEO |
| `persona` | A "find my place" shortcut: title, tagline, the sections it applies to, and a filter preset |
| `area` | Neighborhood with description, location and image |
| `amenity` | Taxonomy: stable `code`, localized label, category, "show as chip on cards" flag |
| `agent` | Contact shown on a listing (name, role, WhatsApp, photo, languages) |
| `page` | Free pages (about, legal) |
| `siteSettings` | Singleton: site name, tagline, trust points, legal entity, default currency, estimated tax percent, placeholder USD to MXN rate |

Objects: `localeString`, `localeText`, `localeBlock` (field-level translation: Spanish required, English optional with fallback), `seo`, `galleryImage`, `vacationTerms`, `rentalTerms`, `saleTerms`, `seasonalRate`, `rentalIncomeEstimate`, `bedEntry`, `amenityEntry`, `viewingOptions`.

### `property` fields

- **Basics**: `listingType`, `title`, `slug`, `status` (available, reserved/under offer, rented/sold, paused), `featured`, `isSample`, `summary`, `description`, `audiences[]`
- **Photos**: `gallery[]` of 1 to 20 images, each with hotspot, localized alt text, caption and a `room` tag. The first photo is the cover. `tourUrl` for video or 3D.
- **Details**: `propertyType`, `bedrooms`, `bathrooms`, `maxGuests` (hidden for sale), `beds[]`, `builtAreaM2`, `landAreaM2`, `floor`, `furnished`, `parkingSpaces`, `petFriendly`, `stepFreeAccess`, `wifiMbps`, `dedicatedWorkspace`, `beachDistanceKm`, `amenities[]` (reference plus optional detail)
- **Price and terms** (shown by type):
  - `vacation`: currency, nightly and weekend rate, cleaning fee, security deposit, min/max nights, check-in/out time, instant book, cancellation policy, house rules, seasonal rates
  - `rental`: currency, monthly rent, deposit (months), `minLeaseMonths` and `maxLeaseMonths` (validated 1 to 11), available from, utilities included, pets policy, applicant requirements
  - `sale`: currency, asking price, predial, monthly maintenance, ownership (`escritura` or `fideicomiso`, relevant to foreign buyers in the coastal zone), year built, financing options, optional investor income estimate
  - `viewing` (rental and sale): modes (in person, video), slot length, lead time, notes
  - `agent`
- **Location**: `area`, private `address` (never queried by the site), `location` geopoint (the site rounds it to about 1 km unless `showExactPin` is on), `registrationNumber` (tourism registration or permit)
- **SEO**: title, description, image, `noIndex`

Validation: type-specific terms are required for their type; the 1 to 11 month lease range is enforced; gallery max 20.

## 3. How the site uses the model

| Concern | Implementation |
|---|---|
| Top-level navigation | One tab per `listingSection`: Stays, Rentals, For sale. Localized URLs: `/es/estancias`, `/en/stays`, `/es/rentas`, `/en/rentals`, `/es/venta`, `/en/sale` |
| Persona shortcuts | `persona.preset` becomes GROQ filters (`audiences`, `bedrooms`, `maxGuests`, `petFriendly`, `wifiMbps`, `beachDistanceKm`). Shown as chips on each section page, on the home page and in the header menu |
| Filters per section | Vacation: dates, guests, bedrooms, pets, remote work. Rental: lease length, move-in date, bedrooms, budget, pets, remote work. Sale: type, bedrooms, budget. State lives in the URL |
| Card per type | Vacation: nightly price, estimated stay total when dates are chosen, "no service fee". Rental: monthly rent, lease window, move-in date, deposit. Sale: asking price, price per m², title type, investor estimate |
| Primary action per type | Vacation: Reserve (dates, guests, estimate, contact, send). Rental: Book a tour (day, time, in person or video, contact) with Start application. Sale: Book a viewing (same picker) |
| Photos | `next/image` with a custom loader that asks Sanity's CDN for the needed width and AVIF/WebP, plus the LQIP blur placeholder |
| Freshness | Reads use `'use cache'` with the tag `sanity`; the `/api/revalidate` route (secret header) marks it stale. Create a Sanity webhook on publish that POSTs there with `x-revalidate-secret` |
| SEO | Per-page metadata from `seo` fields with fallbacks, hreflang alternates, `VacationRental` / `RealEstateListing` JSON-LD, `sitemap.xml`, `robots.txt`; sample listings are `noindex` |

## 4. Photo carousel (up to 20 photos)

- **Touch**: native horizontal scroll-snap, one photo per swipe, with momentum. Buttons are 44 px or larger.
- **Keyboard**: the carousel is focusable; Left/Right change photo, Home/End jump to first/last; Previous/Next are real buttons; thumbnails are a roving-tabindex group (arrow keys move within it). No keyboard trap.
- **Screen readers**: `role="region"` with `aria-roledescription="carousel"`, each slide `aria-roledescription="slide"` with "Photo 3 of 20", a polite live region announces changes, and an instruction line is linked with `aria-describedby`.
- **Full-screen**: native `<dialog>` (focus trap, Escape closes, focus returns to the trigger) keeping the same photo position in sync with the inline carousel.
- No autoplay; respects `prefers-reduced-motion`.

Tested in Chrome with Playwright: keyboard (Tab, arrows, Home, End), buttons, thumbnails, lightbox open/close/sync, real touch swipes advancing exactly one photo, no horizontal page scroll on a phone viewport.

## 4b. Virtual tour (360°)

`property.tour` (object `virtualTour`): up to 12 rooms, each with an equirectangular panorama (2:1 image), a localized title, a starting direction, and **links** (arrows) to other rooms given as a room ID, a direction in degrees (0 = straight ahead, 90 = right) and a height. An optional hosted-tour URL (Matterport, Kuula) shows as a secondary link.

On the site the tour is a call to action under the gallery (and a "360°" badge on cards). It opens full screen: drag or pinch on touch, mouse drag and wheel, arrow keys, `+`/`-` and Home on a keyboard, real buttons for the room arrows and a room list, and a **Book a viewing** button that is always visible and takes the visitor to the booking panel. The viewer is plain WebGL, about 6 KB of code, loaded only when a tour starts. Links like `…/sale/sample-casa-venta?tour=1` open the tour on arrival. Panoramas load a small preview first, then the sharp version.

The Sanity project must allow the site's origins in **CORS** (done for `www.prop.bz`, `prop.bz` and local development): the CDN refuses panorama textures otherwise.

Sample photos and tours for the three sale listings are generated by `tools/sample-media` (three.js in headless Chrome) and attached with `studio/scripts/seed-sample-media.ts`. They are illustrations, not photography.

## 5. Seed content

`studio/scripts/seed.ts` is idempotent (fixed document IDs). It creates taxonomy, the 6 vacation properties taken from the legacy site (real descriptions, bed counts, fees, amenity flags and up to 20 photos each, downscaled before upload) and 3 sample rentals and 3 sample sales marked `isSample`. The sample listings have no photos (cards show a color placeholder). Delete the samples before launch. Vacation properties do not yet have measured wifi speeds, pet policies or cleaning fees, so the remote-work and pets persona filters return few or no stays until the team fills those in.

Commands, from `studio/`:

```
npx sanity schemas deploy                               # publish the schema
npx sanity exec scripts/seed.ts --with-user-token       # (re)seed content and photos
npx sanity dev                                          # Studio on http://localhost:3333
```

## 6. Open items

- ~~Create the revalidation webhook~~ Done: webhook "Refresh website (www.prop.bz)" (id `M0hFxZnKU92qf8yD`) POSTs `{_id,_type}` to `https://www.prop.bz/api/revalidate` with header `x-revalidate-secret` whenever a property, section, persona, area, amenity, contact, page or site-settings document is created, updated or deleted. Drafts do not trigger it. Edits appear on the live site in about 6 seconds.
  To rotate the secret: set a new `SANITY_REVALIDATE_SECRET` on the `prop-bz-web` Vercel project, redeploy, then run `REVALIDATE_SECRET=<same value> npx sanity exec scripts/create-revalidate-hook.ts --with-user-token` from `studio/` (it replaces the existing hook). Delivery history: `npx sanity hooks logs`.
- Deploy the Studio (`npx sanity deploy`) and add the production site origin to CORS if the site ever reads with credentials.
- Add Sanity TypeGen so GROQ results are typed (the site currently has hand-written types in `web/src/sanity/types.ts`).
- Connect `BOOKING_API_URL` to the booking API's `POST /inquiries`, then replace the estimate with `POST /quotes` and live availability.
- Confirm the photo rights for the legacy images and replace the placeholder tax percent and FX rate with real values.
