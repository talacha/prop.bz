import {launch, BASE} from './helpers.mjs'
const base = BASE
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const browser = await launch()
const ctx = await browser.newContext({viewport: {width: 1280, height: 900}})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const posts = []
page.on('request', (r) => r.url().includes('/api/requests') && posts.push(JSON.parse(r.postData() || '{}')))

// 1. Vacation: dates -> estimate -> reserve in one panel
await page.goto(`${base}/en/stays/solea-5?in=2026-12-20&out=2026-12-27&guests=2`, {waitUntil: 'networkidle'})
ok('dates from URL prefill the panel', (await page.locator('#reserve input[type=date]').first().inputValue()) === '2026-12-20')
const total = await page.locator('#reserve .total dd').textContent()
ok('estimate shown for 7 nights', /\$/.test(total) && /560|666|USD/.test(total), total)
ok('service fee line is $0', (await page.locator('#reserve').textContent()).includes('$0'))
await page.fill('#reserve input[name=name]', 'Ana Pérez')
await page.fill('#reserve input[name=email]', 'ana@example.com')
await page.fill('#reserve input[name=phone]', '+52 984 123 4567')
await page.click('#reserve button.btn')
await page.waitForSelector('#reserve .ok')
ok('booking request posted with dates', posts[0]?.kind === 'booking' && posts[0]?.checkIn === '2026-12-20' && posts[0]?.guests === 2, JSON.stringify(posts[0]).slice(0, 90))
ok('demo-mode notice is shown, not a false success', (await page.locator('#reserve .ok').textContent()).toLowerCase().includes('demo'))

// 2. Rental: book a tour
await page.goto(`${base}/en/rentals/sample-estudio-centro`, {waitUntil: 'networkidle'})
await page.waitForSelector('#reserve .slots button')
ok('7 day buttons rendered', (await page.locator('#reserve .slots').first().locator('button').count()) === 7)
ok('submit disabled until a time is chosen', await page.locator('#reserve button.btn').first().isDisabled())
await page.locator('#reserve .slots').nth(1).locator('button').nth(2).click()
ok('submit enabled after choosing a time', !(await page.locator('#reserve button.btn').first().isDisabled()))
await page.fill('#reserve input[name=name]', 'Luis Gómez')
await page.fill('#reserve input[name=email]', 'luis@example.com')
await page.fill('#reserve input[name=phone]', '984 555 0101')
await page.locator('#reserve button.btn').first().click()
await page.waitForSelector('#reserve .ok')
ok('tour request posted', posts[1]?.kind === 'tour' && posts[1]?.time === '12:00' && posts[1]?.mode === 'in-person', JSON.stringify(posts[1]).slice(0, 110))

// 3. Sale: book a viewing by video
await page.goto(`${base}/es/venta/sample-condo-venta`, {waitUntil: 'networkidle'})
await page.waitForSelector('#reserve .slots button')
await page.locator('#reserve .slots').nth(1).locator('button').first().click()
await page.locator('#reserve .seg button').nth(1).click()
await page.fill('#reserve input[name=name]', 'Marta Ruiz')
await page.fill('#reserve input[name=email]', 'marta@example.com')
await page.fill('#reserve input[name=phone]', '+1 415 555 0100')
await page.locator('#reserve button.btn').first().click()
await page.waitForSelector('#reserve .ok')
ok('viewing request posted with video mode', posts[2]?.kind === 'viewing' && posts[2]?.mode === 'video', JSON.stringify(posts[2]).slice(0, 110))

// 4. Invalid contact shows an error, nothing sent
await page.goto(`${base}/en/sale/sample-condo-venta`, {waitUntil: 'networkidle'})
await page.waitForSelector('#reserve .slots button')
await page.locator('#reserve .slots').nth(1).locator('button').first().click()
const before = posts.length
await page.fill('#reserve input[name=email]', 'not-an-email')
await page.locator('#reserve button.btn').first().click()
await page.waitForSelector('#reserve .err:not(:empty)')
ok('invalid input shows error, field flagged', (await page.locator('#reserve input[name=email]').getAttribute('aria-invalid')) === 'true')

// 5. Filters + personas via URL
await page.goto(`${base}/en/stays`, {waitUntil: 'networkidle'})
await page.selectOption('.filters select >> nth=0', '6').catch(() => {})
await page.click("main a:has-text(\"Groups of friends\")")
await page.waitForURL(/persona=groups/)
ok('persona chip filters (2 groups-sized stays)', (await page.locator('.card').count()) === 2, String(await page.locator('.card').count()))
await page.goto(`${base}/en/rentals`, {waitUntil: 'networkidle'})
await page.selectOption('.filters select >> nth=0', '9')
await page.waitForURL(/lease=9/)
await page.waitForTimeout(500)
ok('lease 9 months excludes the 1-6 month loft (2 left)', (await page.locator('.card').count()) === 2, String(await page.locator('.card').count()))
await page.goto(`${base}/es/venta`, {waitUntil: 'networkidle'})
await page.click("main a:has-text(\"Inversionistas\")")
await page.waitForURL(/persona=investors/)
ok('investors persona -> condo + land (2)', (await page.locator('.card').count()) === 2, String(await page.locator('.card').count()))

// 6. language switch keeps the page, localizes the section segment
await page.goto(`${base}/es/rentas?persona=pet-owners`, {waitUntil: 'networkidle'})
await page.click('.prefs-btn')
await page.click('.prefs-panel a[hreflang=en]')
await page.waitForURL(/\/en\/rentals/)
ok('ES -> EN swaps section slug and keeps query', page.url().endsWith('/en/rentals?persona=pet-owners'), page.url())
ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
console.log(out.join('\n')); console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
