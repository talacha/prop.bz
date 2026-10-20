# Prop.bz

Direct booking, rental and sales site for A Toda Madre Properties (Playa del Carmen).

```
docs/       plans, API spec (openapi.yaml), SQL schema, security audit, content model, SEO and design notes
frontend/   design prototype and the redesign reference (single HTML files)
tools/      sample-media: renders the sample photos and 360° panoramas
studio/     Sanity Studio (project 1npz4e5x, dataset production)
web/        Next.js 16 site that reads from Sanity
```

## Run locally

```bash
# Studio (http://localhost:3333)
cd studio && npm install && npx sanity dev

# Site (http://localhost:3000)
cd web && npm install && cp .env.example .env.local && npm run dev
```

The site reads published content from the public dataset, so no token is needed. Production build: `npm run build && npm start` in `web/`. Tests: with the site running on port 3100, `npm run e2e` in `web/` (set `BASE_URL=https://www.prop.bz` to test the live site); the SEO audit is `python3 -I e2e/seo-audit.py http://localhost:3100`. CI runs the same checks (`.github/workflows/ci.yml`). If a CSS change does not show up in a build, delete `web/.next` and rebuild.

## Content

```bash
cd studio
npx sanity schemas deploy                          # deploy schema changes
npx sanity exec scripts/seed.ts --with-user-token  # seed or reset demo content (needs `sanity login`)
```

Start with `docs/00-PLAN.md`; the Sanity model and website behavior are in `docs/08-sanity-content-model.md`.
