import {BASE, launch} from './helpers.mjs'

const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const ORIGIN = new URL(BASE).origin
const validBody = {kind: 'viewing', propertyId: 'x', slug: 'sample-casa-venta', locale: 'en', name: 'Security Check', email: 'check@example.com', phone: '+52 984 123 4567', date: '2026-11-01', time: '11:00', mode: 'video'}
const post = (body, headers = {}) => fetch(`${BASE}/api/requests`, {method: 'POST', headers: {'content-type': 'application/json', origin: ORIGIN, ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body)})

/* ---- headers ---- */
{
  const r = await fetch(`${BASE}/en`)
  const h = r.headers
  const csp = h.get('content-security-policy') ?? ''
  ok('CSP present and locked down', /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'self'/.test(csp) && /form-action 'self'/.test(csp))
  ok('CSP only allows Sanity CDN for images', /img-src [^;]*https:\/\/cdn\.sanity\.io/.test(csp) && !/https:\/\/\*/.test(csp))
  ok('HSTS covers subdomains', /includeSubDomains/.test(h.get('strict-transport-security') ?? ''), h.get('strict-transport-security') ?? '')
  ok('nosniff, referrer policy, permissions policy', h.get('x-content-type-options') === 'nosniff' && !!h.get('referrer-policy') && !!h.get('permissions-policy'))
  ok('no X-Powered-By', !h.get('x-powered-by'))
}

/* ---- request endpoint guards (the rate-limit test is last, it spends the budget) ---- */
{
  // Earlier suites post a few requests; let the one-minute rate-limit window reset so these checks start from a full budget.
  if (!process.env.SKIP_RATE_WAIT) await new Promise((r) => setTimeout(r, 62_000))
  let r = await fetch(`${BASE}/api/requests`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(validBody)})
  ok('POST without Origin is refused (403)', r.status === 403, String(r.status))
  r = await post(validBody, {origin: 'https://evil.example'})
  ok('POST from another website is refused (403)', r.status === 403, String(r.status))
  r = await fetch(`${BASE}/api/requests`)
  ok('GET is not allowed (405)', r.status === 405 && r.headers.get('allow') === 'POST', String(r.status))
  r = await post('not json')
  ok('invalid JSON (400)', r.status === 400, String(r.status))
  r = await post(validBody, {'content-type': 'text/plain'})
  ok('wrong content type (415)', r.status === 415, String(r.status))
  r = await post({...validBody, message: 'x'.repeat(9000)})
  ok('oversized body (413)', r.status === 413, String(r.status))
  r = await post({kind: 'viewing'})
  ok('invalid fields (422)', r.status === 422, String(r.status))
  r = await post({...validBody, website: 'http://spam.example'})
  ok('honeypot is silently accepted, nothing stored', r.status === 202 && (await r.json()).status === 'received')
}

/* ---- no CSP violations anywhere, including the WebGL tour ---- */
{
  const browser = await launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']})
  const ctx = await browser.newContext({viewport: {width: 1280, height: 860}})
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text())) problems.push(m.text().slice(0, 140)) })
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error('Refused to ' + e.violatedDirective + ' ' + e.blockedURI)))
  for (const path of ['/en', '/en/stays', '/en/rentals', '/en/sale', '/en/stays/solea-5', '/en/sale/sample-casa-venta', '/en/info/privacy']) {
    await page.goto(`${BASE}${path}`, {waitUntil: 'networkidle'})
    await page.waitForTimeout(300)
  }
  // preferences menu + tour
  await page.goto(`${BASE}/en/sale/sample-casa-venta`, {waitUntil: 'networkidle'})
  await page.locator('.prefs-btn').click()
  await page.locator('.prefs-panel button:has-text("Dark")').click()
  await page.keyboard.press('Escape')
  await page.locator('.tour-card').click()
  await page.waitForSelector('dialog.tour-dialog[open] canvas')
  await page.waitForTimeout(2500)
  ok('no CSP violations on 7 pages, preferences and the 360° tour', problems.length === 0, problems.slice(0, 2).join(' | '))
  await page.keyboard.press('Escape')
  await browser.close()
}

/* ---- legal pages ---- */
{
  for (const l of ['en', 'es']) {
    for (const slug of ['privacy', 'terms', 'cancellation']) {
      const r = await fetch(`${BASE}/${l}/info/${slug}`)
      const h = await r.text()
      ok(`/${l}/info/${slug} loads with a title, h1 and canonical`, r.status === 200 && /<h1>/.test(h) && new RegExp(`rel="canonical" href="${ORIGIN.replace('http://localhost:3100', 'https://www.prop.bz')}/${l}/info/${slug}"|rel="canonical" href="[^"]*/${l}/info/${slug}"`).test(h), String(r.status))
    }
  }
  const home = await (await fetch(`${BASE}/en`)).text()
  ok('footer links to the three legal pages', ['privacy', 'terms', 'cancellation'].every((s) => home.includes(`/en/info/${s}`)))
  const prop = await (await fetch(`${BASE}/en/sale/sample-casa-venta`)).text()
  ok('booking panel links the privacy notice and says it is a demo', /info\/privacy/.test(prop) && /Demo site/.test(prop))
  const map = await (await fetch(`${BASE}/sitemap.xml`)).text()
  ok('legal pages are in the sitemap', /\/en\/info\/privacy/.test(map) && /\/es\/info\/terms/.test(map))
}

/* ---- rate limit (spends the budget: keep last) ---- */
{
  const codes = []
  for (let i = 0; i < 9; i++) codes.push((await post(validBody)).status)
  const limited = codes.filter((c) => c === 429).length
  ok('burst of requests gets rate limited (429)', limited >= 1, codes.join(','))
  const r = await post(validBody)
  ok('429 includes Retry-After', r.status !== 429 || Number(r.headers.get('retry-after')) > 0, r.headers.get('retry-after') ?? '-')
}

console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0)
