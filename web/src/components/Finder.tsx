'use client'

import {useRouter} from 'next/navigation'
import {useId, useState, useSyncExternalStore} from 'react'
import Link from 'next/link'
import {sectionPath, type ListingType, type Locale} from '@/i18n/config'
import {getDictionary} from '@/i18n/dictionary'

const noop = () => () => {}
type Persona = {slug: string; title: string}
const TABS: {type: ListingType; key: 'tabStay' | 'tabRent' | 'tabBuy'}[] = [
  {type: 'vacation', key: 'tabStay'},
  {type: 'rental', key: 'tabRent'},
  {type: 'sale', key: 'tabBuy'},
]

/**
 * One search for all three ways to use a property. It sends people straight to the right section
 * with their answers already applied (the same URL parameters the section filters use).
 */
export function Finder({locale, personas}: {locale: Locale; personas: Record<ListingType, Persona[]>}) {
  const t = getDictionary(locale)
  const router = useRouter()
  const id = useId()
  const [type, setType] = useState<ListingType>('vacation')
  // Today's date exists only in the browser (empty during the static build), so the page stays prerenderable.
  const today = useSyncExternalStore(noop, () => new Date().toISOString().slice(0, 10), () => '') || undefined

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const qs = new URLSearchParams()
    for (const [k, v] of data.entries()) if (typeof v === 'string' && v !== '') qs.set(k, v)
    router.push(`${sectionPath(locale, type)}${qs.size ? `?${qs}` : ''}`)
  }

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setType(next.type)
    document.getElementById(`${id}-${next.type}`)?.focus()
    e.preventDefault()
  }

  const num = (n: number) => Array.from({length: n}, (_, i) => i + 1)
  return (
    <form className="finder" aria-label={t.finderLabel} onSubmit={onSubmit}>
      <div className="f-tabs" role="tablist" aria-label={t.finderLabel}>
        {TABS.map((tab, i) => (
          <button
            key={tab.type}
            id={`${id}-${tab.type}`}
            type="button"
            role="tab"
            className="f-tab"
            data-type={tab.type}
            aria-selected={type === tab.type}
            aria-controls={`${id}-panel`}
            tabIndex={type === tab.type ? 0 : -1}
            onClick={() => setType(tab.type)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t[tab.key]}
          </button>
        ))}
      </div>

      <div key={type /* fresh, empty fields per tab; the tabs keep focus */} className="f-fields" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${type}`}>
        {type === 'vacation' && (
          <>
            <label className="field">{t.checkIn}<input name="in" type="date" min={today} suppressHydrationWarning /></label>
            <label className="field">{t.checkOut}<input name="out" type="date" min={today} suppressHydrationWarning /></label>
            <label className="field">{t.guestsLabel}
              <select name="guests" defaultValue=""><option value="">{t.any}</option>{[1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
            </label>
            <label className="field">{t.minBedrooms}
              <select name="beds" defaultValue=""><option value="">{t.any}</option>{num(3).map((n) => <option key={n} value={n}>{n}+</option>)}</select>
            </label>
          </>
        )}
        {type === 'rental' && (
          <>
            <label className="field">{t.leaseMonths}
              <select name="lease" defaultValue=""><option value="">{t.any}</option>{[1, 3, 6, 9, 11].map((n) => <option key={n} value={n}>{t.months(n)}</option>)}</select>
            </label>
            <label className="field">{t.moveIn}<input name="movein" type="date" min={today} suppressHydrationWarning /></label>
            <label className="field">{t.minBedrooms}
              <select name="beds" defaultValue=""><option value="">{t.any}</option>{num(2).map((n) => <option key={n} value={n}>{n}+</option>)}</select>
            </label>
            <label className="field">{t.maxPrice} (MXN)<input name="max" type="number" inputMode="numeric" min={0} step={1000} placeholder="25000" /></label>
          </>
        )}
        {type === 'sale' && (
          <>
            <label className="field">{t.propertyType}
              <select name="ptype" defaultValue=""><option value="">{t.anyType}</option>{['apartment', 'house', 'villa', 'townhouse', 'penthouse', 'land'].map((k) => <option key={k} value={k}>{t.types[k]}</option>)}</select>
            </label>
            <label className="field">{t.minBedrooms}
              <select name="beds" defaultValue=""><option value="">{t.any}</option>{num(4).map((n) => <option key={n} value={n}>{n}+</option>)}</select>
            </label>
            <label className="field">{t.maxPrice} (MXN)<input name="max" type="number" inputMode="numeric" min={0} step={100000} placeholder="8000000" /></label>
            <label className="field">{t.tourFilter}
              <select name="tour" defaultValue=""><option value="">{t.any}</option><option value="1">{t.withTour}</option></select>
            </label>
          </>
        )}
        <button type="submit" className="f-go" data-type={type}>{type === 'vacation' ? t.searchStays : type === 'rental' ? t.searchRentals : t.searchSale}</button>
      </div>

      {personas[type]?.length ? (
        <div className="f-quick">
          <span>{t.quickLead}</span>
          {personas[type].map((p) => (
            <Link key={p.slug} className="pill" href={`${sectionPath(locale, type)}?persona=${p.slug}`}>{p.title}</Link>
          ))}
        </div>
      ) : null}
    </form>
  )
}
