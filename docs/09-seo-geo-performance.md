# 09 — SEO, GEO and Performance

"GEO" here means two things: **generative-engine optimization** (being found and quoted by AI assistants and AI search) and **local/geographic SEO** (Playa del Carmen, Quintana Roo).

## 1. Measured results (Lighthouse, mobile, simulated slow 4G)

| Page | Before (live) | After (live) |
|---|---|---|
| Home | Perf 98 · SEO 92 · A11y 100 | Perf 98 · SEO 100 · A11y 100 · BP 100 · CLS 0 |
| Property | Perf 88 · SEO 92 · LCP 3.2 s · SI 5.3 s | Perf 99 · SEO 100 · LCP 2.2 s · SI ≈1 s · CLS 0 |
| Section (local build) | Perf 90 · SEO 92 · **CLS 0.156** | Perf 94 · SEO 100 · CLS 0 |

Example (sample) listings score ~69 on SEO on purpose: they are `noindex`.

Failures found in the baseline and fixed: invalid `hreflang` (relative URLs), card link names that did not match their visible text, heading levels that skipped, a layout shift from results streaming in, an LCP image with no fetch priority, and a property page loading all 20 photos up front.

## 2. What was implemented

### Metadata and sharing
| Item | Detail |
|---|---|
| Absolute URLs everywhere | `metadataBase` from `NEXT_PUBLIC_SITE_URL` (default `https://www.prop.bz`) |
| Titles and descriptions | Per page, bilingual, with place and price ("Solea 5 · Departamento · Playa del Carmen"); description built from the summary plus price, trimmed to ~158 characters |
| Canonical + hreflang | `es`, `en` and `x-default` on every page; query-string pages canonicalize to the clean path |
| Open Graph + Twitter | `og:title/description/url/locale/alternate locale`, `summary_large_image` |
| **Social image** | Generated per page (`opengraph-image`): property photo, title, facts and price over a dark gradient, brand star, bold type. Served as **JPEG, 25–73 KB** at 1200×630 (a PNG with a photo is ~1 MB, which WhatsApp often skips) |
| Icons | Yellow circle with star: `icon.svg` (tabs), 48 px PNG (crawlers), 180 px apple-touch icon, 192/512 manifest icons, `manifest.webmanifest` |
| Theme color | Light and dark `theme-color` |
| Robots meta | `max-image-preview:large`, `max-snippet:-1`; sample listings `noindex,follow` |
| Local SEO meta | `geo.region`, `geo.placename`, `geo.position`, `ICBM` |
| Verification hooks | `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` env vars |

### Structured data (JSON-LD, escaped against `</script>` injection)
`RealEstateAgent` + `WebSite` (site-wide, with `areaServed`), `BreadcrumbList`, `CollectionPage` + `ItemList` on section pages, `VacationRental` (with `containsPlace`, beds, occupancy, amenities, check-in/out, up to 12 images, rounded coordinates) for stays, `RealEstateListing` + `Offer` (monthly price spec for rentals) for rentals and sales, and `FAQPage`.

### GEO (AI assistants and answer engines)
| Item | Detail |
|---|---|
| `/llms.txt` | Site summary plus every real listing with key facts and links in both languages |
| `/llms-full.txt` | Full plain-text details of each listing (facts, amenities, rules, description) |
| Facts as text | Key facts line, amenity lists, and data-derived **FAQs** on every property page (price, guests, check-in, cancellation, lease, title type…), each answer built only from that listing's own data |
| Section and home FAQs | Visible `<details>` plus `FAQPage` markup |
| `robots.txt` | Explicitly allows Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended, Applebot-Extended, CCBot and others; blocks only `/api/`. **Policy choice:** training crawlers are allowed so the listings can be cited; to opt out of training only, move `GPTBot`, `Google-Extended`, `CCBot`, `ClaudeBot`, `Applebot-Extended` to `disallow: '/'` in `web/src/app/robots.ts` |
| Entity signals | Consistent name, address locality, languages and coordinates across markup, meta, `llms.txt` |

### Sitemap
`/sitemap.xml`: home, 3 sections, every real listing, in both languages, each with hreflang alternates, `lastmod` from Sanity, and up to 5 image entries.

### Performance
| Change | Effect |
|---|---|
| Images served by Sanity's CDN with `auto=format` | **AVIF** to browsers that support it, **WebP** next, JPEG last (verified: 41 KB AVIF, 54 KB WebP, 69 KB JPEG for the same photo) |
| CDN crops to the displayed shape (`ar=4:3`, focal point) at quality 60 on cards | Fewer pixels downloaded |
| LCP image: `preload` + `fetchpriority="high"`, never lazy | Fixes "LCP not prioritised" |
| Carousel renders only the current ±2 photos; the rest are a blurred preview until reached | Property page no longer fetches 20 photos up front |
| Tuned `deviceSizes`, `imageSizes`, `qualities` | Right-sized srcsets |
| `preconnect` to `cdn.sanity.io` | Earlier image connection |
| Fonts via `next/font` (self-hosted, `swap`, size-adjusted fallback) | No layout shift from fonts |
| Skeletons with the real footprint for streaming results and filters | **CLS 0.156 → 0** |
| `experimental.inlineCss` | Removes the render-blocking stylesheet request |
| Heavy code loaded on demand: the 360° viewer (WebGL) loads only when a tour starts or is hovered | Zero cost for most visits |
| Render loop that draws only when something changes (tour) | No idle GPU/battery use |
| Security and cache headers | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`; immutable cache for icons |
| Accessibility fixes that overlap with SEO | Link names match visible text, no skipped headings, descriptive image `alt` (listing title plus "photo n of m", or the editor's alt text) |

Not actionable here: ~14 KiB of "legacy JavaScript" (Array.at/flat polyfills) sits inside Next's own framework chunk.

## 3. Recommendations that need you (not code)

> Update 2026-10-20: all landing pages audited live with **0 issues** (see `web/e2e/seo-audit.py`). Titles are keyword-first and 44–75 characters; the rentals share image uses a tinted portfolio photo; legal pages have share images; the audit is part of CI.

1. **Google Search Console and Bing Webmaster Tools:** verify `www.prop.bz` (set the env vars above or use DNS), submit `https://www.prop.bz/sitemap.xml`, and watch Core Web Vitals field data.
2. ~~Create the Sanity publish webhook~~ Done (see doc 08); the site reads from Sanity's origin API so webhook refreshes always see the new content.
3. **Google Business Profile** for the business (consistent name, address, phone/WhatsApp), and link it to the site.
4. **Replace placeholders in Sanity:** delete the six sample listings (they are `noindex`), add real alt text to photos (descriptions of what is shown, in both languages), and fill in wifi speed, pet policy and cleaning fees on the stays.
5. **Reviews:** collect verified guest reviews, then add `aggregateRating` to the `VacationRental` markup (Google requires real ratings).
6. **Legal and trust pages** (privacy notice, terms, cancellation policy, contact) with real content; they are also ranking and trust signals.
7. **Backlinks and mentions:** local directories, the tourism board, and partner sites; share tour links (`…?tour=1`) on WhatsApp and Instagram.
8. **Check social previews** in the Facebook Sharing Debugger and by sending a link on WhatsApp; clear the cache after changing an image.
9. **Add real photography** for rentals and sales (the current sale photos and tours are generated samples) and shoot real 360° tours.
10. **Monitor:** add Vercel Speed Insights or Web Vitals reporting to track real-user LCP/INP, and re-run Lighthouse after content changes.
11. **IndexNow** (Bing and others): optional, ping on publish from the webhook.
12. **Replace the placeholder FX rate and tax percentage** in Site settings before showing converted prices publicly.
