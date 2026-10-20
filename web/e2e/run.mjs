// Runs every browser suite against BASE_URL (default http://localhost:3100) and prints a summary.
// Usage: npm run build && npx next start -p 3100 &   then   npm run e2e
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
// security.mjs goes last: it spends the endpoint's rate-limit budget.
const suites = ['carousel', 'prefs', 'tour', 'home', 'flows', 'security']
const only = process.argv.slice(2)
let failed = 0
for (const name of suites.filter((s) => !only.length || only.includes(s))) {
  const r = spawnSync('node', [`${dir}${name}.mjs`], {encoding: 'utf8', timeout: 300_000})
  const lines = (r.stdout ?? '').split('\n')
  const bad = lines.filter((l) => l.startsWith('FAIL'))
  // flows.mjs reports one console line for the 422 it provokes on purpose (invalid email): not a defect.
  const real = bad.filter((l) => !(name === 'flows' && /no page errors.*422/.test(l)))
  const pass = lines.filter((l) => l.startsWith('PASS')).length
  console.log(`${real.length ? 'FAIL' : 'ok  '} ${name.padEnd(9)} ${pass} passed${real.length ? `, ${real.length} failed` : ''}`)
  for (const l of real) console.log('     ' + l)
  if (real.length || r.status === null) failed++
}
console.log(failed ? `\n${failed} suite(s) failed` : '\nall suites passed')
process.exit(failed ? 1 : 0)
