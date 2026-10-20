import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Suspense} from 'react'
import {Filters} from '@/components/Filters'
import {PropertyCard} from '@/components/PropertyCard'
import {isLocale, listingTypes, locales, sectionFromSlug, sectionPath, sectionSlugs, type ListingType, type Locale} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {toMxn} from '@/lib/pricing'
import {getProperties, getSection, getSettings, type PropertyFilters} from '@/sanity/fetch'
import type {SectionPage} from '@/sanity/types'

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const num = (v: string | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined)

export const generateStaticParams = () => locales.flatMap((locale) => listingTypes.map((ty) => ({locale, section: sectionSlugs[ty][locale]})))

export async function generateMetadata({params}: {params: Promise<{locale: string; section: string}>}): Promise<Metadata> {
  const {locale, section} = await params
  if (!isLocale(locale)) return {}
  const type = sectionFromSlug(locale, section)
  if (!type) return {}
  const s = await getSection(type)
  return {
    title: loc(s?.title, locale),
    description: loc(s?.tagline, locale),
    alternates: {languages: Object.fromEntries(locales.map((l) => [l, sectionPath(l, type)]))},
  }
}

export default async function SectionPageRoute({params, searchParams}: {params: Promise<{locale: string; section: string}>; searchParams: Promise<Search>}) {
  const {locale, section} = await params
  if (!isLocale(locale)) notFound()
  const type = sectionFromSlug(locale, section)
  if (!type) notFound()
  const s = await getSection(type)
  if (!s) notFound()
  const t = getDictionary(locale)

  return (
    <div data-type={type}>
      <header className="section-head">
        <div className="eyebrow">{loc(s.navLabel, locale)}</div>
        <h1>{loc(s.title, locale)}</h1>
        <p>{loc(s.tagline, locale)}</p>
      </header>
      <Suspense fallback={<div className="filters" aria-hidden="true" style={{minHeight: 120}} />}>
        <PersonaChips s={s} locale={locale} searchParams={searchParams} />
        <Filters type={type} locale={locale} />
      </Suspense>
      <Suspense fallback={<p className="muted" role="status">…</p>}>
        <Results type={type} locale={locale} s={s} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function PersonaChips({s, locale, searchParams}: {s: SectionPage; locale: Locale; searchParams: Promise<Search>}) {
  const t = getDictionary(locale)
  const active = one((await searchParams).persona)
  const base = sectionPath(locale, s.sectionType)
  if (!s.personas?.length) return null
  return (
    <nav aria-label={t.findByPersona}>
      <div className="chips">
        <Link className="pill" href={base} aria-current={!active ? 'true' : undefined}>{t.allPersonas}</Link>
        {s.personas.map((p) => (
          <Link key={p._id} className="pill" href={`${base}?persona=${p.slug}`} aria-current={active === p.slug ? 'true' : undefined} title={loc(p.tagline, locale)}>
            {loc(p.title, locale)}
          </Link>
        ))}
      </div>
    </nav>
  )
}

async function Results({type, locale, s, searchParams}: {type: ListingType; locale: Locale; s: SectionPage; searchParams: Promise<Search>}) {
  const t = getDictionary(locale)
  const sp = await searchParams
  const persona = s.personas?.find((p) => p.slug === one(sp.persona))
  const pre = persona?.preset ?? {}

  const filters: PropertyFilters = {
    audience: pre.audience,
    minBedrooms: num(one(sp.beds)) ?? pre.minBedrooms,
    minGuests: num(one(sp.guests)) ?? pre.minGuests,
    pets: one(sp.pets) === '1' || !!pre.petFriendly,
    remote: one(sp.remote) === '1' || !!pre.remoteWorkReady,
    maxBeachKm: pre.maxBeachKm,
    propertyType: one(sp.ptype),
  }
  const [all, settings] = await Promise.all([getProperties(type, filters), getSettings()])
  const fx = settings.usdToMxn
  const maxMxn = num(one(sp.max))
  const lease = num(one(sp.lease))
  const moveIn = one(sp.movein)

  const list = all.filter((p) => {
    if (maxMxn) {
      const price = type === 'vacation' ? p.vacation?.nightlyRate : type === 'rental' ? p.rental?.monthlyRent : p.sale?.askingPrice
      const cur = (p.vacation ?? p.rental ?? p.sale)?.currency ?? 'MXN'
      if (price && toMxn(price, cur, fx) > maxMxn) return false
    }
    if (lease && p.rental) {
      if ((p.rental.minLeaseMonths ?? 1) > lease || (p.rental.maxLeaseMonths ?? 11) < lease) return false
    }
    if (moveIn && p.rental?.availableFrom && p.rental.availableFrom > moveIn) return false
    return true
  })

  const carry = {in: one(sp.in), out: one(sp.out), guests: one(sp.guests)}
  return (
    <>
      <div className="results-head">
        <h2 style={{fontSize: '1.2rem'}} role="status" aria-live="polite">{t.results(list.length)}{persona ? ` · ${loc(persona.title, locale)}` : ''}</h2>
        {persona && <span className="muted">{loc(persona.tagline, locale)}</span>}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((p, i) => <PropertyCard key={p._id} p={p} locale={locale} carry={carry} taxPercent={settings.estimatedTaxPercent ?? 19} priority={i < 3} />)}
        </div>
      ) : (
        <div className="empty">{t.empty}</div>
      )}
    </>
  )
}
