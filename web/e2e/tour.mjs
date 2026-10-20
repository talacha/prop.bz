import {launch, BASE} from './helpers.mjs'
const base = BASE
const out = []
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const browser = await launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']})
const ctx = await browser.newContext({viewport: {width: 1280, height: 860}})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const requests = []
page.on('request', (r) => /pano|cdn\.sanity\.io/.test(r.url()) && requests.push(r.url()))

await page.goto(`${base}/en/sale/sample-casa-venta`, {waitUntil: 'networkidle'})
ok('tour card is on the page', await page.locator('.tour-card').isVisible())
ok('viewer code not loaded before the tour starts', !(await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /PanoViewer/.test(r.name)))))
await page.locator('.tour-card').click()
await page.waitForSelector('dialog.tour-dialog[open] canvas')
ok('dialog opens with a canvas', true)
await page.waitForFunction(() => !document.querySelector('.tour-stage .tour-status'), null, {timeout: 20000}).catch(() => {})
await page.waitForTimeout(1500)

// Is WebGL actually drawing something that is not a flat color?
const sample = async () => page.evaluate(() => {
  const c = document.querySelector('.tour-stage canvas')
  const t = document.createElement('canvas'); t.width = 64; t.height = 40
  const g = t.getContext('2d'); g.drawImage(c, 0, 0, 64, 40)
  const d = g.getImageData(0, 0, 64, 40).data
  let sum = 0, min = 255, max = 0
  for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; min = Math.min(min, l); max = Math.max(max, l) }
  return {mean: Math.round(sum / (d.length / 4)), spread: Math.round(max - min), hash: Array.from(d).filter((_, i) => i % 97 === 0).join(',')}
})
// preserveDrawingBuffer is off, so screenshot instead
const shot = async (name) => { await page.screenshot({path: name}); return name }
await shot('tour-living.png')
const hot = page.locator('.tour-hotspot')
ok('room arrows are rendered as buttons', (await hot.count()) === 2, String(await hot.count()))
ok('arrows have accessible names', (await hot.first().getAttribute('aria-label')).startsWith('Go to'), await hot.first().getAttribute('aria-label'))
const visibleHot = await page.locator('.tour-hotspot:visible').count()
ok('at least one arrow is on screen at the start', visibleHot >= 1, String(visibleHot))
ok('room chips list 3 rooms', (await page.locator('.tour-room').count()) === 3)
ok('first room is current', (await page.locator('.tour-room[aria-current="true"]').textContent()) === 'Living and dining')
ok('textures fetched through the CDN with CORS', requests.some((u) => /cdn\.sanity\.io.*w=1024/.test(u)), requests.length + ' requests')
ok('sharp texture requested after the preview', requests.some((u) => /w=4096/.test(u)))

// pixel check using a screenshot of the stage
const stageBox = await page.locator('.tour-stage').boundingBox()
const buf1 = await page.screenshot({clip: stageBox})
ok('stage is not blank', buf1.length > 30000, String(buf1.length))

// keyboard rotates the view
await page.locator('.tour-stage').focus()
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
await page.waitForTimeout(400)
const buf2 = await page.screenshot({clip: stageBox})
ok('ArrowRight changes the picture', !buf1.equals(buf2))
await page.keyboard.press('Home'); await page.waitForTimeout(300)
const buf3 = await page.screenshot({clip: stageBox})
await page.keyboard.press('+'); await page.waitForTimeout(300)
const buf4 = await page.screenshot({clip: stageBox})
ok('plus zooms in', !buf4.equals(buf3))

// mouse drag
await page.mouse.move(stageBox.x + 600, stageBox.y + 300)
await page.mouse.down(); await page.mouse.move(stageBox.x + 300, stageBox.y + 300, {steps: 8}); await page.mouse.up()
await page.waitForTimeout(500)
const buf5 = await page.screenshot({clip: stageBox})
ok('mouse drag changes the picture', !buf5.equals(buf4))

// go to another room via an arrow
await page.keyboard.press('Home'); await page.waitForTimeout(300)
const toKitchen = page.locator('.tour-hotspot', {hasText: 'Kitchen'})
// bring the kitchen arrow into view by using the room chip path as a fallback
if (!(await toKitchen.isVisible())) {
  await page.locator('.tour-stage').focus()
  for (let i = 0; i < 12 && !(await toKitchen.isVisible()); i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(60) }
}
ok('kitchen arrow can be brought on screen', await toKitchen.isVisible())
await toKitchen.click()
await page.waitForTimeout(1200)
ok('arrow switches room (chip + announcement)', (await page.locator('.tour-room[aria-current="true"]').textContent()) === 'Kitchen' && /You are in: Kitchen/.test(await page.locator('.tour-stage [aria-live]').textContent()))
await page.screenshot({path: 'tour-kitchen.png'})
await page.locator('.tour-room', {hasText: 'Garden'}).click()
await page.waitForTimeout(1200)
ok('room chip switches room', (await page.locator('.tour-room[aria-current="true"]').textContent()) === 'Garden and pool')
await page.screenshot({path: 'tour-garden.png'})

// Tab reaches the arrows; focus is visible
await page.locator('.tour-stage').focus()
await page.keyboard.press('Tab')
ok('Tab from the viewer reaches a control', await page.evaluate(() => !!document.activeElement?.closest('.tour')))

// Book a viewing closes the tour and focuses the panel
await page.locator('.tour-book').click()
await page.waitForTimeout(800)
ok('dialog closed by Book a viewing', !(await page.locator('dialog.tour-dialog').evaluate((d) => d.open)))
const inView = await page.evaluate(() => { const r = document.getElementById('reserve').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 })
ok('booking panel scrolled into view', inView)
ok('focus moved into the booking panel', await page.evaluate(() => !!document.activeElement?.closest('#reserve')))

// reopen, Escape closes and returns focus to the card
await page.locator('.tour-card').click()
await page.waitForSelector('dialog.tour-dialog[open] canvas')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
ok('Escape closes the tour', !(await page.locator('dialog.tour-dialog').evaluate((d) => d.open)))
ok('focus returns to the tour card', await page.evaluate(() => document.activeElement?.classList.contains('tour-card')))

// Spanish page
await page.goto(`${base}/es/venta/sample-condo-venta`, {waitUntil: 'networkidle'})
ok('ES: tour card says Recorrido virtual', (await page.locator('.tour-card').textContent()).includes('Recorrido virtual'))
// cards show the 360 badge
await page.goto(`${base}/en/sale`, {waitUntil: 'networkidle'})
ok('sale cards carry the 360° badge', (await page.locator('.badge.tour').count()) === 3, String(await page.locator('.badge.tour').count()))
// stays have no tour
await page.goto(`${base}/en/stays/solea-5`, {waitUntil: 'networkidle'})
ok('stays without a tour show no tour card', (await page.locator('.tour-card').count()) === 0)
ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))

// mobile: touch drag + pinch availability + layout
const m = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, hasTouch: true, isMobile: true})
const pm = await m.newPage()
await pm.goto(`${base}/es/venta/sample-condo-venta`, {waitUntil: 'networkidle'})
await pm.locator('.tour-card').tap()
await pm.waitForSelector('dialog.tour-dialog[open] canvas')
await pm.waitForTimeout(2200)
const sb = await pm.locator('.tour-stage').boundingBox()
const a = await pm.screenshot({clip: sb})
const cdp = await m.newCDPSession(pm)
const y = sb.y + 70
await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: sb.x + 300, y}]})
for (let i = 1; i <= 14; i++) { await pm.waitForTimeout(16); await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: sb.x + 300 - i * 16, y}]}) }
await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
await pm.waitForTimeout(700)
const b = await pm.screenshot({clip: sb})
ok('touch drag turns the view', !a.equals(b))
const bookBox = await pm.locator('.tour-book').boundingBox()
ok('Book button is full width and big enough on phone', bookBox.height >= 48 && bookBox.width > 300, JSON.stringify(bookBox))
const closeBox = await pm.locator('.tour-close').boundingBox()
ok('Close button is a 44px target', closeBox.height >= 44, JSON.stringify(closeBox))
await pm.screenshot({path: 'tour-mobile.png'})
await browser.close()
console.log(out.join('\n'))
console.log(out.some((l) => l.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED')
