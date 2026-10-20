import type {Currency} from '@/sanity/types'

export const FALLBACK_USD_TO_MXN = 18.5 // overridden by siteSettings.usdToMxn

export const toMxn = (amount: number, currency: Currency, usdToMxn = FALLBACK_USD_TO_MXN) =>
  currency === 'USD' ? amount * usdToMxn : amount

export function nightsBetween(a?: string, b?: string): number {
  if (!a || !b) return 0
  const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 86_400_000) : 0
}

/** Client-side estimate shown before the booking API quotes exact figures. */
export function estimateStay(opts: {nightly: number; nights: number; cleaning?: number; taxPercent: number}) {
  const accommodation = opts.nightly * opts.nights
  const cleaning = opts.cleaning ?? 0
  const taxes = Math.round((accommodation + cleaning) * (opts.taxPercent / 100))
  return {accommodation, cleaning, taxes, total: accommodation + cleaning + taxes}
}
