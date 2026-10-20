import {launch, BASE} from './helpers.mjs'
const base = BASE
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const browser = await launch()
const ctx = await browser.newContext({viewport: {width: 1280, height: 900}, colorScheme: 'light'})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(`${base}/es/estancias/solea-5`, {waitUntil: 'networkidle'})
const priceText = () => page.locator('.panel .price').first().textContent()
ok('ES defaults to pesos (converted, approximate)', /\$1,\d{3}/.test(await priceText()) && /≈/.test(await priceText()), await priceText())
const btn = page.locator('.prefs-btn')
ok('menu closed initially', (await btn.getAttribute('aria-expanded')) === 'false')
await btn.click()
ok('menu opens', (await btn.getAttribute('aria-expanded')) === 'true' && (await page.locator('.prefs-panel').isVisible()))
ok('USD/MXN, ES/EN and light/dark controls exist', (await page.locator('.prefs-panel .seg-btn').count()) === 6)
ok('MXN pressed by default for es', (await page.locator('.prefs-panel button:has-text("MXN")').getAttribute('aria-pressed')) === 'true')

// currency
await page.locator('.prefs-panel button:has-text("USD")').click()
await page.waitForTimeout(300)
ok('USD shows the listing price (no ≈)', !(await priceText()).includes('≈') && /80/.test(await priceText()), await priceText())
ok('currency persists in localStorage', (await page.evaluate(() => localStorage.getItem('currency'))) === 'USD')

// theme
await page.locator('.prefs-panel button:has-text("Oscuro")').click()
ok('dark sets data-theme', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
ok('background actually dark', bg === 'rgb(10, 24, 32)', bg)
ok('dark button pressed', (await page.locator('.prefs-panel button:has-text("Oscuro")').getAttribute('aria-pressed')) === 'true')
await page.locator('.prefs-panel button:has-text("Claro")').click()
const bgL = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
ok('light restores light background', bgL === 'rgb(244, 247, 246)', bgL)
await page.locator('.prefs-panel button:has-text("Oscuro")').click()
await page.screenshot({path: 'prefs-open-dark.png'})

// Escape closes + focus returns
await page.keyboard.press('Escape')
ok('Escape closes the menu', (await btn.getAttribute('aria-expanded')) === 'false')
ok('focus returns to the button', await page.evaluate(() => document.activeElement?.classList.contains('prefs-btn')))
await btn.click()
await page.mouse.click(40, 600)
ok('click outside closes', (await btn.getAttribute('aria-expanded')) === 'false')

// persistence across reload, no flash: theme applied before hydration
await page.reload({waitUntil: 'domcontentloaded'})
const early = await page.evaluate(() => document.documentElement.dataset.theme)
ok('theme applied at first paint after reload', early === 'dark', early)
await page.waitForLoadState('networkidle')
ok('currency still USD after reload', !(await priceText()).includes('≈'), await priceText())

// language link: keeps page, swaps section slug, sets cookie
await btn.click()
await page.locator('.prefs-panel a:has-text("English")').click()
await page.waitForURL(/\/en\/stays\/solea-5/)
ok('language switch keeps the property, localizes the path', page.url().endsWith('/en/stays/solea-5'), page.url())
ok('NEXT_LOCALE cookie saved', (await ctx.cookies()).some((c) => c.name === 'NEXT_LOCALE' && c.value === 'en'))
const r = await ctx.request.get(`${base}/`, {maxRedirects: 0})
ok('visiting / goes to the saved language', r.status() === 307 && r.headers()['location']?.endsWith('/en'), `${r.status()} ${r.headers()['location']}`)

// keyboard
await page.goto(`${base}/en`, {waitUntil: 'networkidle'})
await page.focus('.prefs-btn')
await page.keyboard.press('Enter')
await page.keyboard.press('Tab')
ok('Tab moves into the menu controls', await page.evaluate(() => !!document.activeElement?.closest('.prefs-panel')))

// no saved choice + dark OS follows the OS
const ctx2 = await browser.newContext({colorScheme: 'dark'})
const p2 = await ctx2.newPage()
await p2.goto(`${base}/en`, {waitUntil: 'networkidle'})
const bg2 = await p2.evaluate(() => getComputedStyle(document.body).backgroundColor)
ok('no saved choice: OS dark applies', bg2 === 'rgb(10, 24, 32)', bg2)
await p2.locator('.prefs-btn').click()
ok('menu reflects the effective theme (Dark pressed)', (await p2.locator('.prefs-panel button:has-text("Dark")').getAttribute('aria-pressed')) === 'true')

// mobile
const m = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, hasTouch: true})
const pm = await m.newPage()
await pm.goto(`${base}/es/venta`, {waitUntil: 'networkidle'})
await pm.locator('.prefs-btn').tap()
const box = await pm.locator('.prefs-panel').boundingBox()
ok('mobile panel fits the screen', box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box))
await pm.screenshot({path: 'prefs-mobile.png'})
ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
