'use client'

import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {useTransition} from 'react'
import type {ListingType} from '@/i18n/config'
import {getDictionary} from '@/i18n/dictionary'
import type {Locale} from '@/i18n/config'

/**
 * Filters differ by section. State lives in the URL so results are shareable and the back button works.
 * vacation: dates + guests + beach + pets          (the booking context is carried to the property page)
 * rental:   lease length + move-in + bedrooms + budget + pets
 * sale:     type + bedrooms + budget + investor
 */
export function Filters({type, locale}: {type: ListingType; locale: Locale}) {
  const t = getDictionary(locale)
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, start] = useTransition()

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp.toString())
    if (v === null || v === '' || v === 'false') next.delete(k)
    else next.set(k, v)
    next.delete('persona')
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, {scroll: false}))
  }
  const val = (k: string) => sp.get(k) ?? ''
  const has = ['in', 'out', 'guests', 'beds', 'max', 'pets', 'remote', 'beach', 'lease', 'movein', 'ptype', 'persona', 'tour'].some((k) => sp.has(k))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form className="filters" role="search" aria-busy={pending} onSubmit={(e) => e.preventDefault()}>
      <div className="filters-grid">
        {type === 'vacation' && (
          <>
            <label className="field">{t.checkIn}<input type="date" min={today} value={val('in')} onChange={(e) => set('in', e.target.value)} /></label>
            <label className="field">{t.checkOut}<input type="date" min={val('in') || today} value={val('out')} onChange={(e) => set('out', e.target.value)} /></label>
            <label className="field">{t.guestsLabel}
              <select value={val('guests')} onChange={(e) => set('guests', e.target.value)}>
                <option value="">–</option>
                {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label className="field">{t.minBedrooms}
              <select value={val('beds')} onChange={(e) => set('beds', e.target.value)}>
                <option value="">–</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
          </>
        )}
        {type === 'rental' && (
          <>
            <label className="field">{t.leaseMonths}
              <select value={val('lease')} onChange={(e) => set('lease', e.target.value)}>
                <option value="">–</option>
                {Array.from({length: 11}, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t.months(n)}</option>)}
              </select>
            </label>
            <label className="field">{t.moveIn}<input type="date" min={today} value={val('movein')} onChange={(e) => set('movein', e.target.value)} /></label>
            <label className="field">{t.minBedrooms}
              <select value={val('beds')} onChange={(e) => set('beds', e.target.value)}>
                <option value="">–</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label className="field">{t.maxPrice} (MXN)<input type="number" inputMode="numeric" step={1000} min={0} value={val('max')} onChange={(e) => set('max', e.target.value)} placeholder="25000" /></label>
          </>
        )}
        {type === 'sale' && (
          <>
            <label className="field">{t.propertyType}
              <select value={val('ptype')} onChange={(e) => set('ptype', e.target.value)}>
                <option value="">{t.anyType}</option>
                {['apartment', 'house', 'villa', 'townhouse', 'penthouse', 'land'].map((k) => <option key={k} value={k}>{t.types[k]}</option>)}
              </select>
            </label>
            <label className="field">{t.minBedrooms}
              <select value={val('beds')} onChange={(e) => set('beds', e.target.value)}>
                <option value="">–</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label className="field">{t.maxPrice} (MXN)<input type="number" inputMode="numeric" step={100000} min={0} value={val('max')} onChange={(e) => set('max', e.target.value)} placeholder="8000000" /></label>
          </>
        )}
        {type === 'sale' && (
          <label className="check"><input type="checkbox" checked={sp.get('tour') === '1'} onChange={(e) => set('tour', e.target.checked ? '1' : null)} />{t.withTour}</label>
        )}
        {type !== 'sale' && (
          <label className="check"><input type="checkbox" checked={sp.get('pets') === '1'} onChange={(e) => set('pets', e.target.checked ? '1' : null)} />{t.petFriendly}</label>
        )}
        {type !== 'sale' && (
          <label className="check"><input type="checkbox" checked={sp.get('remote') === '1'} onChange={(e) => set('remote', e.target.checked ? '1' : null)} />{t.remoteWork}</label>
        )}
      </div>
      {has && (
        <button type="button" className="pill" style={{justifySelf: 'start'}} onClick={() => start(() => router.replace(pathname, {scroll: false}))}>
          {t.clear}
        </button>
      )}
    </form>
  )
}
