import Link from 'next/link'
import {Photo} from './Photo'
import {propertyPath, type Locale} from '@/i18n/config'
import {formatMoney, getDictionary, loc, type Dictionary} from '@/i18n/dictionary'
import {estimateStay, nightsBetween} from '@/lib/pricing'
import type {PropertyCardData} from '@/sanity/types'

type Props = {
  p: PropertyCardData
  locale: Locale
  /** Carry the visitor's dates and guests to the property page. */
  carry?: {in?: string; out?: string; guests?: string}
  taxPercent: number
  priority?: boolean
}

export function PropertyCard({p, locale, carry, taxPercent, priority}: Props) {
  const t = getDictionary(locale)
  const qs = new URLSearchParams()
  if (p.listingType === 'vacation' && carry) {
    if (carry.in) qs.set('in', carry.in)
    if (carry.out) qs.set('out', carry.out)
    if (carry.guests) qs.set('guests', carry.guests)
  }
  const href = propertyPath(locale, p.listingType, p.slug) + (qs.size ? `?${qs}` : '')
  const cover = p.photos[0]
  const closed = p.status === 'closed'
  const reserved = p.status === 'reserved'

  return (
    <Link href={href} className="card" data-type={p.listingType} aria-label={loc(p.title, locale)}>
      <div className="card-photo">
        {cover ? <Photo photo={cover} locale={locale} sizes="(max-width: 700px) 100vw, 360px" priority={priority} /> : <div className="ph-empty" aria-hidden="true">{loc(p.area, locale) || '·'}</div>}
        <div className="badges">
          {p.isSample && <span className="badge dark">{t.sample}</span>}
          {p.featured && <span className="badge sun">★</span>}
          {p.listingType === 'vacation' && p.vacation?.instantBook && <span className="badge">{t.instant}</span>}
          {p.listingType === 'sale' && p.sale?.ownership && p.sale.ownership !== 'other' && <span className="badge">{t[p.sale.ownership]}</span>}
          {reserved && <span className="badge dark">{p.listingType === 'sale' ? 'Under offer' : 'Reserved'}</span>}
          {closed && <span className="badge dark">{p.listingType === 'sale' ? 'Sold' : 'Rented'}</span>}
        </div>
        {p.photoCount > 1 && <span className="photo-count num">{t.photos(p.photoCount)}</span>}
      </div>
      <div className="card-body">
        <h3>{loc(p.title, locale)}</h3>
        <span className="meta">{[loc(p.area, locale), p.propertyType && t.types[p.propertyType]].filter(Boolean).join(' · ')}</span>
        <Specs p={p} t={t} />
        {p.listingType === 'vacation' && <VacationFoot p={p} locale={locale} t={t} carry={carry} taxPercent={taxPercent} />}
        {p.listingType === 'rental' && <RentalFoot p={p} locale={locale} t={t} />}
        {p.listingType === 'sale' && <SaleFoot p={p} locale={locale} t={t} />}
      </div>
    </Link>
  )
}

function Specs({p, t}: {p: PropertyCardData; t: Dictionary}) {
  const isLand = p.propertyType === 'land'
  const bits: string[] = []
  if (isLand) {
    if (p.landAreaM2) bits.push(`${p.landAreaM2} m²`)
  } else {
    if (p.bedrooms !== undefined) bits.push(t.bedrooms(p.bedrooms))
    if (p.bathrooms) bits.push(t.baths(p.bathrooms))
    if (p.listingType === 'vacation' && p.maxGuests) bits.push(t.guests(p.maxGuests))
    if (p.listingType !== 'vacation' && p.builtAreaM2) bits.push(`${p.builtAreaM2} m²`)
  }
  if (p.beachDistanceKm !== undefined) bits.push(t.beach(p.beachDistanceKm))
  return <span className="meta">{bits.join(' · ')}</span>
}

/** Vacation: nightly rate, estimated stay total when dates are chosen, trust line. */
function VacationFoot({p, locale, t, carry, taxPercent}: {p: PropertyCardData; locale: Locale; t: Dictionary; carry?: Props['carry']; taxPercent: number}) {
  const v = p.vacation
  if (!v?.nightlyRate) return null
  const nights = nightsBetween(carry?.in, carry?.out)
  const est = nights ? estimateStay({nightly: v.nightlyRate, nights, cleaning: v.cleaningFee, taxPercent}) : null
  return (
    <div className="card-foot">
      {est ? (
        <>
          <div className="price"><b className="num">{formatMoney(est.total, v.currency, locale)}</b><span className="meta">{t.total} · {t.nights(nights)}</span></div>
          <span className="meta num">{formatMoney(v.nightlyRate, v.currency, locale)} {t.perNight}</span>
        </>
      ) : (
        <div className="price"><span className="meta">{t.from}</span><b className="num">{formatMoney(v.nightlyRate, v.currency, locale)}</b><span className="meta">{t.perNight}</span></div>
      )}
      <span className="good">{t.noService}</span>
    </div>
  )
}

/** Rental: monthly rent, lease window, move-in date, deposit. */
function RentalFoot({p, locale, t}: {p: PropertyCardData; locale: Locale; t: Dictionary}) {
  const r = p.rental
  if (!r?.monthlyRent) return null
  return (
    <div className="card-foot">
      <div className="price"><b className="num">{formatMoney(r.monthlyRent, r.currency, locale)}</b><span className="meta">{t.perMonth}</span></div>
      {r.minLeaseMonths && r.maxLeaseMonths && <span className="rent-tag">{t.leaseRange(r.minLeaseMonths, r.maxLeaseMonths)}</span>}
      <span className="meta">
        {[r.availableFrom && `${t.availableFrom} ${new Date(r.availableFrom + 'T00:00:00Z').toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {day: 'numeric', month: 'short', timeZone: 'UTC'})}`,
          p.furnished ? (locale === 'es' ? 'Amueblado' : 'Furnished') : null,
          (p.petFriendly || r.petsPolicy === 'allowed') ? (locale === 'es' ? 'Mascotas ok' : 'Pets ok') : null].filter(Boolean).join(' · ')}
      </span>
    </div>
  )
}

/** Sale: asking price, price per m², ownership, investor estimate. */
function SaleFoot({p, locale, t}: {p: PropertyCardData; locale: Locale; t: Dictionary}) {
  const s = p.sale
  if (!s?.askingPrice) return null
  const area = p.propertyType === 'land' ? p.landAreaM2 : p.builtAreaM2
  const inc = s.incomeEstimate
  return (
    <div className="card-foot">
      <div className="price"><b className="num">{formatMoney(s.askingPrice, s.currency, locale)}</b></div>
      {area ? <span className="meta num">{formatMoney(Math.round(s.askingPrice / area), s.currency, locale)} {t.perM2}</span> : null}
      {inc?.monthlyRevenue ? (
        <span className="est num">{t.estYield}: {formatMoney(inc.monthlyRevenue, inc.currency, locale)}/{locale === 'es' ? 'mes' : 'mo'}{inc.occupancyPercent ? ` · ${inc.occupancyPercent}%` : ''} ({t.estimate})</span>
      ) : s.monthlyMaintenanceFee ? (
        <span className="meta num">{t.maintenance}: {formatMoney(s.monthlyMaintenanceFee, s.currency, locale)}/{locale === 'es' ? 'mes' : 'mo'}</span>
      ) : null}
    </div>
  )
}
