import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Suspense} from 'react'
import {FaqSection} from '@/components/FaqSection'
import {Filters} from '@/components/Filters'
import {JsonLd} from '@/components/JsonLd'
import {PropertyCard} from '@/components/PropertyCard'
import {isLocale, listingTypes, locales, sectionFromSlug, sectionPath, sectionSlugs, type ListingType, type Locale} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {sectionFaqs} from '@/lib/faq'
import {breadcrumbLd, faqLd, itemListLd} from '@/lib/jsonld'
import {toMxn} from '@/lib/pricing'
import {abs, languageAlternates} from '@/lib/site'
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
  const title = getDictionary(locale).seoSection[type] // keyword first; the layout appends the brand
  const description = `${loc(s?.tagline, locale)} ${locale === 'es' ? 'Propiedades en Playa del Carmen, Quintana Roo, con fotos, precios y datos clave.' : 'Properties in Playa del Carmen, Quintana Roo, with photos, prices and key facts.'}`
  const paths = Object.fromEntries(locales.map((l) => [l, sectionPath(l, type)])) as Record<Locale, string>
  return {
    title,
    description,
    alternates: {canonical: abs(paths[locale]), languages: languageAlternates(paths)},
    openGraph: {title, description, url: abs(paths[locale])},
  }
}

export default async function SectionPageRoute({params, searchParams}: {params: Promise<{locale: string; section: string}>; searchParams: Promise<Search>}) {
  const {locale, section} = await params
  if (!isLocale(locale)) notFound()
  const type = sectionFromSlug(locale, section)
  if (!type) notFound()
  const s = await getSection(type)
  if (!s) notFound()
  const faqs = sectionFaqs(type, locale)
  const all = await getProperties(type)

  return (
    <div className="wrap" data-type={type}>
      <JsonLd
        data={[
          itemListLd(loc(s.title, locale), type, locale, all),
          breadcrumbLd([{name: 'Home', path: `/${locale}`}, {name: loc(s.navLabel, locale), path: sectionPath(locale, type)}]),
          faqLd(faqs),
        ].filter(Boolean)}
      />
      <header className="section-head">
        <div className="eyebrow">{loc(s.navLabel, locale)}</div>
        <h1>{loc(s.title, locale)}</h1>
        <p>{loc(s.tagline, locale)}</p>
      </header>
      <Suspense fallback={<div className="filters filters-skeleton" aria-hidden="true" />}>
        <PersonaChips s={s} locale={locale} searchParams={searchParams} />
        <Filters type={type} locale={locale} />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results type={type} locale={locale} s={s} searchParams={searchParams} />
      </Suspense>
      <FaqSection faqs={faqs} title={locale === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'} id="faq" />
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
    tour: one(sp.tour) === '1',
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
        <p className="results-count" role="status" aria-live="polite">{t.results(list.length)}{persona ? ` · ${loc(persona.title, locale)}` : ''}</p>
        {persona && <span className="muted">{loc(persona.tagline, locale)}</span>}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((p, i) => <PropertyCard key={p._id} p={p} locale={locale} carry={carry} taxPercent={settings.estimatedTaxPercent ?? 19} priority={i === 0} headingLevel={2} />)}
        </div>
      ) : (
        <div className="empty">{t.empty}</div>
      )}
    </>
  )
}

/** Same footprint as the real grid, so streaming the results in does not shift the page. */
function ResultsSkeleton() {
  return (
    <div className="grid" aria-hidden="true" style={{marginTop: 24}}>
      {[0, 1, 2].map((i) => <div key={i} className="card skeleton" />)}
    </div>
  )
}
