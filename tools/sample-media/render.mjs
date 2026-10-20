// Usage: node render.mjs [out-dir] [name ...]   e.g.  node render.mjs out casa-front pano:casa-living
// Renders stills (2400x1600 JPEG) and equirectangular panoramas (4096x2048 JPEG) with three.js in headless Chrome.
import {createServer} from 'node:http'
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root = fileURLToPath(new URL('.', import.meta.url))
const outDir = process.argv[2] ?? join(root, 'out')
const only = process.argv.slice(3)
mkdirSync(outDir, {recursive: true})

const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript'}
const server = createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, p === '/' ? 'index.html' : p)
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404).end(); return }
  res.writeHead(200, {'content-type': types[extname(file)] ?? 'application/octet-stream'}).end(readFileSync(file))
}).listen(0)
const port = server.address().port

const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']})
const page = await browser.newPage({viewport: {width: 800, height: 600}})
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log('[page]', m.text().slice(0, 200)))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
await page.goto(`http://localhost:${port}/`)
await page.waitForFunction('window.ready === true', null, {timeout: 60000})

const shots = await page.evaluate('window.listShots()')
const panos = await page.evaluate('window.listPanos()')
const jobs = [...shots.map((n) => ({kind: 'shot', n})), ...panos.map((n) => ({kind: 'pano', n}))].filter((j) => !only.length || only.includes(j.n) || only.includes(`${j.kind}:${j.n}`))
for (const j of jobs) {
  const t0 = Date.now()
  const url = await page.evaluate(([k, n]) => (k === 'shot' ? window.renderShot(n) : window.renderPano(n)), [j.kind, j.n])
  const file = join(outDir, `${j.kind === 'pano' ? 'pano-' : ''}${j.n}.jpg`)
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'))
  console.log(`${j.kind} ${j.n} -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
}
await browser.close()
server.close()
