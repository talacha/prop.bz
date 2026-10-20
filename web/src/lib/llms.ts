import {listingTypes, propertyPath, sectionPath, type ListingType} from '@/i18n/config'
import {formatMoney, loc} from '@/i18n/dictionary'
import {getProperties, getProperty, getSection, getSettings, getSlugs} from '@/sanity/fetch'
import type {PropertyCardData, PropertyDetail} from '@/sanity/types'
import {abs, PLACE} from './site'

const TYPE_LABEL: Record<ListingType, string> = {vacation: 'Vacation stays (days to weeks)', rental: 'Rentals (leases of 1 to 11 months)', sale: 'Properties for sale'}

function price(p: PropertyCardData | PropertyDetail): string {
  if (p.vacation?.nightlyRate) return `from ${formatMoney(p.vacation.nightlyRate, p.vacation.currency, 'en')} per night, no service fee`
  if (p.rental?.monthlyRent) return `${formatMoney(p.rental.monthlyRent, p.rental.currency, 'en')} per month`
  if (p.sale?.askingPrice) return `asking ${formatMoney(p.sale.askingPrice, p.sale.currency, 'en')}`
  return ''
}

function facts(p: PropertyCardData): string {
  return [
    p.propertyType === 'land' ? (p.landAreaM2 ? `${p.landAreaM2} m² plot` : 'plot') : p.bedrooms === 0 ? 'studio' : p.bedrooms !== undefined ? `${p.bedrooms} bedroom${p.bedrooms === 1 ? '' : 's'}` : '',
    p.bathrooms ? `${p.bathrooms} bath` : '',
    p.maxGuests && p.listingType === 'vacation' ? `up to ${p.maxGuests} guests` : '',
    p.builtAreaM2 ? `${p.builtAreaM2} m²` : '',
    p.beachDistanceKm !== undefined ? `${p.beachDistanceKm < 1 ? Math.round(p.beachDistanceKm * 1000) + ' m' : p.beachDistanceKm.toFixed(1) + ' km'} to the sea` : '',
    price(p),
  ].filter(Boolean).join(', ')
}

const plain = (blocks: unknown): string =>
  Array.isArray(blocks) ? (blocks as {children?: {text?: string}[]}[]).map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')).filter(Boolean).join('\n\n') : ''

/** llms.txt: a short map of the site for AI assistants (https://llmstxt.org). Sample listings are excluded. */
export async function buildLlmsTxt(): Promise<string> {
  const settings = await getSettings()
  const lines = [
    `# ${settings.siteName}`,
    '',
    `> Direct booking of vacation stays, 1 to 11 month rentals and properties for sale in ${PLACE.locality} and Playacar, ${PLACE.region}, Mexico. Spanish and English. No service fee on stays; prices shown with cleaning and estimated taxes.`,
    '',
    '## Sections',
  ]
  for (const t of listingTypes) {
    const sec = await getSection(t)
    lines.push(`- [${loc(sec?.title, 'en') || TYPE_LABEL[t]}](${abs(sectionPath('en', t))}): ${loc(sec?.tagline, 'en')} (Spanish: ${abs(sectionPath('es', t))})`)
  }
  for (const t of listingTypes) {
    const items = (await getProperties(t)).filter((p) => !p.isSample)
    if (!items.length) continue
    lines.push('', `## ${TYPE_LABEL[t]}`)
    for (const p of items) lines.push(`- [${loc(p.title, 'en')}](${abs(propertyPath('en', t, p.slug))}): ${loc(p.summary, 'en')} ${facts(p)}. (Spanish: ${abs(propertyPath('es', t, p.slug))})`)
  }
  lines.push('', '## Optional', `- [Sitemap](${abs('/sitemap.xml')})`, `- [Full listing details](${abs('/llms-full.txt')})`, '')
  return lines.join('\n')
}

/** llms-full.txt: every real listing with its key facts and description in plain text. */
export async function buildLlmsFullTxt(): Promise<string> {
  const settings = await getSettings()
  const slugs = await getSlugs()
  const out = [`# ${settings.siteName} — full listing details`, '', `Location: ${PLACE.locality}, ${PLACE.region}, ${PLACE.country}. Languages: Spanish, English.`]
  for (const t of listingTypes) {
    const rows = slugs.filter((s) => s.listingType === t)
    const details = (await Promise.all(rows.map((r) => getProperty(t, r.slug)))).filter((p): p is PropertyDetail => !!p && !p.isSample)
    if (!details.length) continue
    out.push('', `## ${TYPE_LABEL[t]}`)
    for (const p of details) {
      out.push('', `### ${loc(p.title, 'en')}`, `URL: ${abs(propertyPath('en', t, p.slug))}`, `Area: ${loc(p.area, 'en')}`, `Key facts: ${facts(p)}`)
      if (p.amenities?.length) out.push(`Amenities: ${p.amenities.map((a) => loc(a.label, 'en') + (loc(a.detail, 'en') ? ` (${loc(a.detail, 'en')})` : '')).join(', ')}`)
      if (p.vacation) out.push(`Stay rules: minimum ${p.vacation.minNights ?? '?'} nights, check-in ${p.vacation.checkInTime ?? '?'}, check-out ${p.vacation.checkOutTime ?? '?'}, cancellation ${p.vacation.cancellationPolicy ?? '?'}`)
      if (p.rental) out.push(`Lease: ${p.rental.minLeaseMonths}-${p.rental.maxLeaseMonths} months, deposit ${p.rental.depositMonths} month(s), available from ${p.rental.availableFrom ?? 'now'}`)
      if (p.sale) out.push(`Sale terms: title ${p.sale.ownership ?? 'n/a'}, financing ${p.sale.financing?.join(', ') ?? 'n/a'}`)
      const d = plain(p.description?.en?.length ? p.description.en : p.description?.es)
      if (d) out.push('', d)
    }
  }
  return out.join('\n') + '\n'
}
