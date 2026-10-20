# 11 — Go-live Status

Scope decision: **this is a live demo site.** Email sending is on hold and requests are intentionally not stored. Status as of 2026-10-20 after the hardening pass.

## Done

| Item | What was done |
|---|---|
| Rate limiting and abuse protection on `/api/requests` | App limiter (5 per minute per IP, per server instance), **Vercel Firewall rule** (10 POSTs per minute per IP on that path only, over-limit requests get 429), same-origin check, 8 KB body cap, JSON-only, GET refused (405), honeypot. Verified live: a burst gets 429 while the rest of the site keeps loading |
| Security headers | Content-Security-Policy (first-party scripts and styles, images only from `cdn.sanity.io`, no framing, forms only to self), HSTS with `includeSubDomains` (no preload yet), COOP, referrer, permissions and nosniff. No CSP violations on any page, the preferences menu or the WebGL tour (tested) |
| Private data in a public dataset | The `address` field was removed from the schema. Exact addresses and access details must live in the booking backend |
| Legal pages | Privacy notice, terms and cancellation policy exist in Spanish and English at `/{locale}/info/{privacy,terms,cancellation}`, linked from the footer and from the booking panel. **Clearly worded as demo placeholders**, not legal text |
| Demo transparency | Every booking panel states "Demo site: your request is not saved or sent" and links the privacy notice |
| WhatsApp | A "Chat on WhatsApp" button and footer link appear automatically once a WhatsApp number is set in Site settings or on a contact |
| Titles, descriptions, share images | All landing pages audited live: **0 issues across 14 pages** (titles keyword-first and 44–75 characters, descriptions 76–151, canonical and hreflang absolute, Open Graph and Twitter complete, 1200×630 JPEG share images 21–71 KB). Rentals now use a tinted portfolio photo instead of a plain gradient |
| Tests in the repo | `web/e2e/` holds the browser suites (carousel, preferences, tour, home, flows, security), a WebKit/Firefox smoke test and the SEO audit. `npm run e2e`, `BASE_URL=https://www.prop.bz npm run e2e` |
| CI | `.github/workflows/ci.yml`: type checks, lint, build, browser tests, SEO audit on every push and pull request (written but not yet run on GitHub) |
| Cross-browser | WebKit (Safari's engine, with an iPhone 14 profile) passes the 16-check smoke test including the WebGL tour and touch layout |
| Publish webhook | Done earlier; edits appear in about 6 seconds |
| `studio.prop.bz` | Resolves on all public resolvers |

## Held on purpose (demo site)

- Email sending and the SPF/DKIM/DMARC setup it needs.
- Storing or forwarding requests (the endpoint stays in demo mode; set `BOOKING_API_URL` to connect a backend).
- Payments, availability, quotes (booking backend, docs 02/03/07).

## Needs the owner or an account

| Item | Why it can't be done autonomously |
|---|---|
| Real content: photos and 360° tours for rentals and sales, real prices, FX rate, tax percentage, alt text for the stays' photos, wifi/pet/cleaning data | Needs the business's real data |
| Real legal text; tourism registration (RNT); IVA/ISH; PROFECO wording | Needs counsel and the accountant |
| WhatsApp number, contact email, legal entity and RFC in Site settings | Needs the business's details |
| CAPTCHA (Cloudflare Turnstile or similar) | Needs an account and keys |
| Error tracking (Sentry), uptime monitoring, analytics, Speed Insights | Needs accounts (and a privacy decision for analytics) |
| Search Console and Bing verification, Google Business Profile | Needs the owner's accounts |
| 2FA and member review for Sanity and Vercel | Account settings |
| Staging dataset | Uses a dataset slot on the Sanity plan; decide first |
| Firefox testing | The Playwright Firefox build would not start on this machine; the test is in the repo and runs in CI on Linux |
| Real-device checks (iPhone Safari, Android Chrome) and a screen-reader pass | Needs hardware; WebKit emulation passed |
| GitHub: commit and push, branch protection, check what the Vercel GitHub link deploys from `main` | Your repository decisions. **None of this work is committed yet** |

## Known trade-offs

- CSP still allows `'unsafe-inline'` scripts (Next.js inlines small scripts); wiring nonces would remove it.
- The in-app rate limiter is per server instance; the Vercel Firewall rule is the real limit.
- Share images render on first request and are then cached for a week by the CDN.
