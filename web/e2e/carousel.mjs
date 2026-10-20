import {devices} from 'playwright-core'
import {BASE, launch} from './helpers.mjs'
const base = BASE
const out = []
const ok = (name, cond, extra = '') => { out.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); }
const browser = await launch()

/* ---------- desktop: keyboard ---------- */
{
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}})
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/es/estancias/solea-5`, {waitUntil: 'networkidle'})
  const counter = () => page.locator('.carousel .counter').first().textContent()
  const live = () => page.locator('.carousel [aria-live]').first().textContent()
  ok('counter starts at 1 / 19', (await counter()) === '1 / 19', await counter())

  // Tab until the carousel itself has focus
  let focused = false
  for (let i = 0; i < 25 && !focused; i++) { await page.keyboard.press('Tab'); focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-roledescription') === 'carousel') }
  ok('carousel reachable with Tab', focused)
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(900)
  ok('ArrowRight x3 -> 4 / 19', (await counter()) === '4 / 19', await counter())
  ok('live region announces', /4 de 19/.test(await live()), await live())
  await page.keyboard.press('End'); await page.waitForTimeout(900)
  ok('End -> 19 / 19', (await counter()) === '19 / 19', await counter())
  ok('next disabled on last', await page.locator('.nav-btn.next').first().isDisabled())
  await page.keyboard.press('Home'); await page.waitForTimeout(900)
  ok('Home -> 1 / 19', (await counter()) === '1 / 19', await counter())
  ok('prev disabled on first', await page.locator('.nav-btn.prev').first().isDisabled())
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300)
  ok('ArrowLeft at start stays 1 / 19', (await counter()) === '1 / 19')

  await page.locator('.nav-btn.next').first().click(); await page.waitForTimeout(900)
  ok('Next button -> 2 / 19', (await counter()) === '2 / 19', await counter())
  await page.locator('.thumb').nth(9).click(); await page.waitForTimeout(900)
  ok('Thumbnail 10 -> 10 / 19', (await counter()) === '10 / 19', await counter())
  ok('thumb marked current', (await page.locator('.thumb[aria-current="true"]').count()) === 1)

  // Lightbox
  await page.locator('.expand').click(); await page.waitForTimeout(500)
  ok('lightbox opens (dialog open)', await page.locator('dialog.lightbox').evaluate((d) => d.open))
  ok('lightbox starts on the same photo', (await page.locator('dialog .counter').textContent()) === '10 / 19', await page.locator('dialog .counter').textContent())
  ok('focus is inside dialog', await page.evaluate(() => !!document.activeElement?.closest('dialog')))
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900)
  ok('lightbox ArrowRight -> 11 / 19', (await page.locator('dialog .counter').textContent()) === '11 / 19', await page.locator('dialog .counter').textContent())
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  ok('Escape closes lightbox', !(await page.locator('dialog.lightbox').evaluate((d) => d.open)))
  ok('inline carousel in sync after closing (11 / 19)', (await counter()) === '11 / 19', await counter())
  await page.screenshot({path: 'desktop-property.png'})
  ok('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '))
  await ctx.close()
}

/* ---------- mobile: thumb swipe ---------- */
{
  const ctx = await browser.newContext({...devices['iPhone 14'], hasTouch: true})
  const page = await ctx.newPage()
  await page.goto(`${base}/es/estancias/solea-5`, {waitUntil: 'networkidle'})
  const track = page.locator('.carousel .track').first()
  const counter = () => page.locator('.carousel .counter').first().textContent()
  const box = await track.boundingBox()
  // real touch drag using CDP touch events
  const cdp = await ctx.newCDPSession(page)
  const swipe = async (dx) => {
    const y = box.y + box.height / 2, x0 = box.x + box.width * (dx < 0 ? 0.8 : 0.2), steps = 18
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y}]})
    for (let i = 1; i <= steps; i++) { await page.waitForTimeout(17); await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (dx * i) / steps, y}]}) }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
    await page.waitForTimeout(1000)
  }
  await swipe(-box.width * 0.6)
  ok('swipe left -> 2 / 19', (await counter()) === '2 / 19', await counter())
  await swipe(-box.width * 0.6)
  ok('swipe left again -> 3 / 19', (await counter()) === '3 / 19', await counter())
  await swipe(box.width * 0.6)
  ok('swipe right -> 2 / 19', (await counter()) === '2 / 19', await counter())
  const snapped = await track.evaluate((t) => Math.abs(t.scrollLeft % t.clientWidth) < 2)
  ok('track snaps to a slide boundary', snapped)
  const btn = await page.locator('.nav-btn.next').first().boundingBox()
  ok('nav buttons >= 44px touch target', btn.width >= 44 && btn.height >= 44, `${btn.width}x${btn.height}`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok('no horizontal page scroll on phone', overflow <= 0, `overflow=${overflow}`)
  await page.screenshot({path: 'mobile-property.png'})
  for (const [name, path] of [['home', '/es'], ['rentals', '/es/rentas'], ['sale', '/es/venta'], ['stays', '/es/estancias']]) {
    await page.goto(`${base}${path}`, {waitUntil: 'networkidle'})
    const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok(`no horizontal scroll on phone: ${name}`, o <= 0, `overflow=${o}`)
    await page.screenshot({path: `mobile-${name}.png`, fullPage: false})
  }
  await ctx.close()
}

/* ---------- desktop screenshots of the three sections ---------- */
{
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}})
  const page = await ctx.newPage()
  for (const [name, path] of [['home', '/en'], ['stays', '/en/stays'], ['rentals', '/en/rentals'], ['sale', '/en/sale'], ['sale-detail', '/en/sale/sample-condo-venta'], ['rental-detail', '/en/rentals/sample-estudio-centro']]) {
    await page.goto(`${base}${path}`, {waitUntil: 'networkidle'})
    await page.screenshot({path: `desktop-${name}.png`})
  }
  await ctx.close()
}
await browser.close()
console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
