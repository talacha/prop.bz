import {chromium} from 'playwright-core'

/** Site under test. Defaults to a local production server; set BASE_URL=https://www.prop.bz to test the live site. */
export const BASE = (process.env.BASE_URL ?? 'http://localhost:3100').replace(/\/$/, '')

/** Chrome by default; in CI set PW_CHANNEL= (empty) to use the Chromium installed by `npx playwright-core install chromium`. */
export function launch(opts = {}) {
  const channel = process.env.PW_CHANNEL ?? 'chrome'
  return chromium.launch({headless: true, ...(channel ? {channel} : {}), ...opts})
}
