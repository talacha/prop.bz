# 05 — Front-End Design

Live prototype: https://claude.ai/artifact/LmzuGMfaR19Q8VPYmNSvLC (private; source in `frontend/prototype/index.html`). It runs sample data and a click counter to prove the flow in [04-ux-benchmark.md](./04-ux-benchmark.md).

## 1. Principles

1. **Price is always the total** once dates are known, with taxes and cleaning included. No fee appears for the first time at checkout.
2. **Dates and guests are global state** (URL query params: `?in=&out=&g=`), carried to every page, card and quote.
3. **No account wall.** Guest checkout; the account is a by-product of the email used.
4. **One decision per screen.** Detail page decides "is this the place"; checkout decides "pay".
5. **Mobile first.** Most Mexican and international leisure traffic is phone-first, and WhatsApp is the default sharing channel.
6. **Fast.** LCP < 2.0 s on mid-range Android over 4G; JS < 150 KB on listing pages; images AVIF/WebP with blurhash.

## 2. Stack

Next.js (App Router, React Server Components, ISR for listing pages), TypeScript, Tailwind + Radix primitives, TanStack Query for client data, `react-day-picker` (range, custom day renderer with per-night price), Stripe Elements (Payment Element + Express Checkout Element for Apple/Google Pay/Link), MapLibre GL with MapTiler/Protomaps tiles, `next-intl` (es-MX default, en), Playwright for E2E, Storybook for components, axe in CI.

## 3. Information architecture

| Route | Purpose |
|---|---|
| `/` | Search rail + results (map/grid), editorial "why book direct" strip, reviews |
| `/p/[slug]` | Property page: gallery, summary, amenities, sticky price card, calendar, reviews, map (fuzzed), policies |
| `/checkout/[quoteId]` | One-page checkout |
| `/trip/[ref]` | Itinerary via magic link: status, check-in guide, messaging, add-to-calendar, cancel/modify |
| `/host/*` | Host console: calendar, bookings, pricing, properties, payouts, reports, invoices |
| `/admin/*` | Staff tools |
| `/legal/*` | Terms, privacy (LFPDPPP aviso), cancellation, house rules |

## 4. Key screens

**Search/home.** Sticky rail: dates (inline two-month range calendar), guests (stepper), live results; no submit button. Cards show availability badge, total for stay, "no service fee" note, beds/baths/capacity, beach distance. Unavailable properties stay visible and dimmed with the reason, so guests can adjust dates instead of hitting empty states.

**Property page.** Photo grid (5-up) with full-screen viewer; sticky reserve card with the date range and price lines; amenity chips grouped (essentials, kitchen, wellness, access); bed breakdown; availability calendar showing nightly price and min-stay; location with approximate pin until booked; reviews with category scores; cancellation timeline visual ("Full refund until Dec 6").

**Checkout.** Express wallet buttons on top, contact fields below (autofill attributes), Payment Element, one consent line merged with the pay button, price summary beside (desktop) or collapsed above (mobile). Hold timer shown only in the last 3 minutes.

**Trip page.** Big status, countdown, door code appearing 48 h before arrival, WhatsApp button, directions, local guide, modify/cancel with refund preview.

**Host console.** Month calendar with drag-to-block and price edits; unified inbox; fees and taxes report for the accountant, CFDI requests; property setup wizard with photo drag-and-drop.

## 5. Design system

- **Type**: Bricolage Grotesque (display), Figtree (body). Scale 12/14/16/20/28/40/56.
- **Color tokens** (light/dark): ink `#0E2230`, surface white / `#11262F`, accent agave teal `#0B6E66` / `#3CC2B4`, sun marigold `#F5B82E` for savings and highlights, line `#D9E2E2`, danger `#B3261E`. All text pairs ≥ 4.5:1.
- **Shape**: 16 px radius for cards, 12 px for controls, pill chips; shadows only on floating layers.
- **Motion**: 150–220 ms ease-out slide for the sheet; respects `prefers-reduced-motion`.
- **Voice**: plain, specific, bilingual; controls name what they do ("Pay $560").

## 6. Accessibility & i18n

WCAG 2.2 AA: keyboard-operable calendar (arrow keys, Home/End, PageUp/Down), focus trap in dialogs, visible focus, `aria-live` for price changes, reduced motion, 44 px targets. Currency toggle MXN/USD, dates localised, copy in es-MX and en-US with translation keys in code, no concatenated sentences.

## 7. SEO & sharing

SSR/ISR pages, `LodgingBusiness`/`VacationRental` JSON-LD with `Offer` and `AggregateRating`, hreflang es/en, `sitemap.xml` and `robots.txt` (both missing on the legacy site), canonical URLs, OG images per property, shareable deep links that keep dates (`/p/solea-5?in=…&out=…&g=2`).

## 8. Analytics

First-party, cookieless funnel events (see UX doc). No third-party ad pixels on checkout pages. Consent banner only if marketing tags are added later.
