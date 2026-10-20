// Smoke test in the other two browser engines: WebKit (Safari, including iPhone Safari) and Firefox.
// Usage: BROWSER=webkit node e2e/crossbrowser.mjs   (or firefox).  Needs: npx playwright-core install webkit firefox
import {devices, firefox, webkit} from 'playwright-core'
import {BASE} from './helpers.mjs'

const name = process.env.BROWSER ?? 'webkit'
const engine = name === 'firefox' ? firefox : webkit
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  [${name}] ${n} ${x}`)
const browser = await engine.launch()
const errors = []

// Desktop
{
  const ctx = await browser.newContext({viewport: {width: 1280, height: 860}})
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && !/422/.test(m.text()) && errors.push(m.text().slice(0, 160)))

  await page.goto(`${BASE}/en`, {waitUntil: 'networkidle'})
  ok('home renders: one h1, finder, hero image', (await page.locator('h1').count()) === 1 && (await page.locator('.f-tab').count()) === 3 && (await page.locator('.hero-media img').count()) === 1)
  ok('hero image actually loaded', await page.evaluate(() => { const i = document.querySelector('.hero-media img'); return !!i && i.complete && i.naturalWidth > 300 }))
  await page.locator('.f-tab', {hasText: 'Rent'}).click()
  ok('finder switches to Rent', (await page.locator('select[name=lease]').count()) === 1)
  await page.selectOption('select[name=lease]', '6')
  await page.locator('.f-go').click()
  await page.waitForURL(/\/en\/rentals\?lease=6/)
  ok('search lands on the filtered rentals page', true, page.url())

  // preferences
  await page.goto(`${BASE}/en/stays/solea-5`, {waitUntil: 'networkidle'})
  await page.locator('.prefs-btn').click()
  await page.locator('.prefs-panel button:has-text("Dark")').click()
  ok('theme switch works', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  await page.keyboard.press('Escape')

  // carousel: keyboard + scroll-snap
  await page.locator('.carousel').first().focus()
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(900)
  ok('carousel ArrowRight x2 -> 3 / 19', (await page.locator('.carousel .counter').first().textContent()) === '3 / 19', await page.locator('.carousel .counter').first().textContent())
  await page.locator('.nav-btn.next').first().click(); await page.waitForTimeout(900)
  ok('carousel Next button -> 4 / 19', (await page.locator('.carousel .counter').first().textContent()) === '4 / 19')

  // 360 tour in this engine's WebGL
  await page.goto(`${BASE}/en/sale/sample-casa-venta`, {waitUntil: 'networkidle'})
  await page.locator('.tour-card').click()
  await page.waitForSelector('dialog.tour-dialog[open] canvas', {timeout: 20000})
  await page.waitForTimeout(3500)
  const noGl = await page.locator('.tour-status[role=alert]').count()
  ok('tour opens and WebGL is available (no error panel)', noGl === 0, noGl ? await page.locator('.tour-status[role=alert]').textContent() : '')
  const a = await page.screenshot()
  await page.locator('.tour-stage').focus()
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  const b = await page.screenshot()
  ok('tour responds to the keyboard (picture changes)', !a.equals(b))
  ok('room arrows and Book button are present', (await page.locator('.tour-hotspot').count()) === 2 && (await page.locator('.tour-book').isVisible()))
  await page.locator('.tour-book').click()
  await page.waitForTimeout(700)
  ok('Book a viewing closes the tour and moves to the panel', !(await page.locator('dialog.tour-dialog').evaluate((d) => d.open)) && (await page.evaluate(() => !!document.activeElement?.closest('#reserve'))))
  await ctx.close()
}

// Phone (iPhone profile in WebKit; a Pixel-sized viewport in Firefox, which has no mobile emulation)
{
  const ctx = await browser.newContext(name === 'webkit' ? {...devices['iPhone 14']} : {viewport: {width: 390, height: 844}, hasTouch: false})
  const page = await ctx.newPage()
  await page.goto(`${BASE}/es`, {waitUntil: 'networkidle'})
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok('phone: no horizontal scroll', overflow <= 0, `overflow=${overflow}`)
  const y = (await page.locator('.finder').boundingBox()).y
  ok('phone: finder visible on the first screen', y < 780, `y=${Math.round(y)}`)
  await page.goto(`${BASE}/es/venta/sample-condo-venta`, {waitUntil: 'networkidle'})
  await (name === 'webkit' ? page.locator('.tour-card').tap() : page.locator('.tour-card').click())
  await page.waitForSelector('dialog.tour-dialog[open] canvas', {timeout: 20000})
  await page.waitForTimeout(3500)
  ok('phone: tour opens without a WebGL error', (await page.locator('.tour-status[role=alert]').count()) === 0)
  const box = await page.locator('.tour-book').boundingBox()
  ok('phone: Book button is full width and 48px+ tall', box.height >= 48 && box.width > 300, JSON.stringify(box))
  await ctx.close()
}

ok('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0)
