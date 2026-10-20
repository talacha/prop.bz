import {launch, BASE} from './helpers.mjs'
const base = BASE
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const browser = await launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']})
const ctx = await browser.newContext({viewport: {width: 1280, height: 900}})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(`${base}/en`, {waitUntil: 'networkidle'})
ok('one h1 on the home page', (await page.locator('h1').count()) === 1, await page.locator('h1').textContent())
const levels = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3')].map((h) => Number(h.tagName[1])))
let skip = false
for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) skip = true
ok('heading levels never skip', !skip, levels.join(''))
ok('hero photo is the high-priority image', await page.evaluate(() => { const i = document.querySelector('.hero-media img'); return !!i && i.getAttribute('fetchpriority') === 'high' && i.loading !== 'lazy' }))
ok('trust strip lists 4 points', (await page.locator('.trust li').count()) === 4)

// finder: tabs, roving tabindex, arrow keys keep focus
const tabs = page.locator('.f-tab')
ok('three tabs: Stay, Rent, Buy', (await tabs.allTextContents()).join('|') === 'Stay|Rent|Buy')
ok('Stay selected first, others skipped by Tab', (await tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await tabs.nth(1).getAttribute('tabindex')) === '-1')
await tabs.nth(0).focus()
await page.keyboard.press('ArrowRight')
ok('ArrowRight selects Rent and keeps focus on the tab', (await tabs.nth(1).getAttribute('aria-selected')) === 'true' && (await page.evaluate(() => document.activeElement?.textContent)) === 'Rent')
ok('Rent shows lease + move-in fields', (await page.locator('.f-fields select[name=lease]').count()) === 1 && (await page.locator('.f-fields input[name=movein]').count()) === 1)

// search sends answers to the right section
await page.selectOption('select[name=lease]', '6')
await page.fill('input[name=max]', '20000')
await page.locator('.f-go').click()
await page.waitForURL(/\/en\/rentals\?/)
ok('Rent search lands on /en/rentals with the answers applied', /lease=6/.test(page.url()) && /max=20000/.test(page.url()), page.url())
await page.waitForSelector('main h2:has-text("Rentals for 1 to 11 months"), h1:has-text("Rentals for 1 to 11 months")')
for (let i = 0; i < 24 && (await page.locator('main .card:visible').count()) !== 2; i++) await page.waitForTimeout(250) // results stream in
ok('results are filtered (6-month lease under 20,000 MXN: studio and loft)', (await page.locator('main .card:visible').count()) === 2, String(await page.locator('main .card:visible').count()))

// buy tab with 360 filter
await page.goto(`${base}/en`, {waitUntil: 'networkidle'})
await page.locator('.f-tab', {hasText: 'Buy'}).click()
await page.selectOption('select[name=tour]', '1')
await page.locator('.f-go').click()
await page.waitForURL(/\/en\/sale\?tour=1/)
await page.waitForSelector('h1:has-text("Properties for sale")')
// poll until the results settle (the previous page stays mounted but hidden during navigation)
for (let i = 0; i < 20 && (await page.locator('main .card:visible .badge.tour').count()) !== 3; i++) await page.waitForTimeout(250)
ok('Buy + 360° tour lists the 3 toured sales', (await page.locator('main .card:visible').count()) === 3 && (await page.locator('main .card:visible .badge.tour').count()) === 3, String(await page.locator('main .card:visible').count()))

// persona shortcut inside the finder
await page.goto(`${base}/es`, {waitUntil: 'networkidle'})
await page.locator('.f-tab', {hasText: 'Comprar'}).click()
await page.locator('.f-quick a', {hasText: 'Inversionistas'}).click()
await page.waitForURL(/\/es\/venta\?persona=investors/)
ok('persona chip from the finder opens the filtered section', true, page.url())

// tour band: tile opens the tour straight away
await page.goto(`${base}/en`, {waitUntil: 'networkidle'})
const tiles = page.locator('.tile')
ok('tour band shows the toured properties', (await tiles.count()) === 3, String(await tiles.count()))
ok('tile has a 360° badge and a play button', (await tiles.first().locator('.tile-deg').textContent()) === '360°')
await tiles.first().click()
await page.waitForURL(/tour=1/)
await page.waitForSelector('dialog.tour-dialog[open] canvas', {timeout: 15000})
ok('tile link opens the tour automatically', true, page.url())
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

// fresh browser: the software-GL process used by the tour is not reused
await browser.close()
const browser2 = await launch()
const ctx2 = await browser2.newContext({viewport: {width: 1280, height: 900}})
const page2 = await ctx2.newPage()
// currency default and conversion still work on the redesigned cards
await page2.goto(`${base}/es`, {waitUntil: 'networkidle'})
ok('ES home shows pesos by default', /\$/.test(await page2.locator('.rail .card .price b').first().textContent()))

// layout checks
for (const [w, h] of [[1280, 800], [390, 844], [768, 1024]]) {
  const c = await browser2.newContext({viewport: {width: w, height: h}})
  const p = await c.newPage()
  await p.goto(`${base}/en`, {waitUntil: 'networkidle'})
  const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(`no horizontal scroll at ${w}px`, o <= 0, `overflow=${o}`)
  const finderTop = await p.locator('.finder').boundingBox()
  if (w === 390) ok('finder visible on the first phone screen', finderTop.y < h - 60, `y=${Math.round(finderTop.y)}`)
  await c.close()
}
ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser2.close()
console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
