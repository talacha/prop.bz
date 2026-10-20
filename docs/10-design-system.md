# 10 — Design Benchmark and Redesign

Reference page (self-contained, light and dark): https://claude.ai/artifact/XzQ6VwdGsEew59FEU6sKUi (source: `frontend/design/home.template.html`, built with `frontend/design/build.py`).

## 1. Benchmark (captured 2026-10-20, desktop, real browser)

| Site | What it does well | What we took |
|---|---|---|
| **Compass** (portal) | Full-bleed photo hero; one search card with Buy / Rent tabs; horizontal rail of "exclusives" with badges | Hero + a single finder with tabs; image-led rails |
| **Airbnb** (portal) | Image-first cards with almost no chrome; rails per theme | Card anatomy; mobile rails with scroll-snap |
| **Matterport** (3D tours) | Immersive visuals as the headline, categories as cards | A dedicated "walk through before you visit" band; the tour as the key action |
| **Lodgify** (SaaS) | Bold dark hero, heavy headline, yellow accent | Confident type, a single warm accent (our star yellow), a dark band for contrast |
| **Guesty / Hostaway** (SaaS) | Large light headline, restrained palette, trust and social proof close to the fold | Calm neutrals, a trust strip directly under the finder (honest claims only) |
| **AppFolio** (SaaS) | Oversized, light-weight headline over a soft photo | Big editorial headline |
| Zillow | Blocked automated browsers, not captured | n/a |

Common pattern: **one photograph, one decision, one accent.** The old home asked visitors to choose between three equal tiles; the new one starts the search immediately.

## 2. Decisions

| Area | Before | After |
|---|---|---|
| First screen | Text headline and three tiles | Full-bleed photo, big headline, **one finder (Stay / Rent / Buy)** overlapping the hero edge, persona shortcuts underneath |
| Search | Only inside each section | Starts on the home page and lands on the right section with answers already applied (same URL parameters as the filters) |
| Trust | Footer line | Four-point strip under the finder (no service fee, 360° tours, direct with the owner, Spanish and English) |
| Tours | A card on property pages | A dark showcase band on the home page; tiles open the tour directly (`?tour=1`) |
| Cards | Flat, bordered | Larger imagery, softer shadow, hover lift and slow image zoom, bolder price (reduced-motion aware) |
| Rails | Grid only | Grid on desktop, swipeable scroll-snap rails on phones |
| Brand | Text | The yellow circle with the star (also the favicon) plus the name |
| Footer | One line | Deep-teal footer with sections, trust points, language and entity |
| Theme | OS only | Light / dark / OS, chosen in Preferences, no flash on load |
| Type | Bricolage Grotesque + Figtree | Same two faces (no new font cost), larger and tighter display scale |
| Palette | Teal / indigo / amber per type | Same, plus a deep ink surface for the footer and tour band; the star yellow is the only warm highlight |

## 3. Guardrails that kept it fast

No new fonts, no animation or carousel libraries, no extra JavaScript on the home page beyond a ~3 KB finder island, CSS-only motion (transform and opacity), one prioritized hero image, fixed aspect-ratio boxes (CLS stays 0), and the 360° viewer loads only on demand. Measured effect: Lighthouse mobile performance stayed at 94–99 with the redesign.

## 4. Preferences menu (currency, language, theme)

One disclosure in the header (gear icon): currency **USD / MXN** (converts every price, shows "≈" and keeps the listing's real price visible; default follows the language), language **Español / English** (keeps the same page, remembers the choice for the next visit), theme with a **sun and a moon**. Keyboard: opens with Enter, Escape closes and returns focus, all controls are Tab stops. Conversion uses a placeholder rate in Site settings.
