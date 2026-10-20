import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PortableText} from '@portabletext/react'
import {Suspense} from 'react'
import {ActionPanel} from '@/components/ActionPanel'
import {FaqSection} from '@/components/FaqSection'
import {Gallery} from '@/components/Gallery'
import {JsonLd} from '@/components/JsonLd'
import {Price} from '@/components/PrefsProvider'
import {TourLauncher} from '@/components/TourLauncher'
import {isLocale, locales, propertyPath, sectionFromSlug, sectionPath, sectionSlugs, type Locale} from '@/i18n/config'
import {formatMoney, getDictionary, loc} from '@/i18n/dictionary'
import {propertyFaqs} from '@/lib/faq'
import {breadcrumbLd, faqLd, propertyLd} from '@/lib/jsonld'
import {abs, languageAlternates, truncate} from '@/lib/site'
import {getProperty, getSection, getSettings, getSlugs} from '@/sanity/fetch'
import type {PropertyDetail} from '@/sanity/types'

type Params = Promise<{locale: string; section: string; slug: string}>
type Search = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

const CATEGORY: Record<string, {es: string; en: string}> = {
  essentials: {es: 'Lo esencial', en: 'Essentials'}, kitchen: {es: 'Cocina', en: 'Kitchen'}, wellness: {es: 'Bienestar', en: 'Wellness'},
  outdoor: {es: 'Exterior', en: 'Outdoors'}, work: {es: 'Trabajo', en: 'Work'}, access: {es: 'Accesos', en: 'Access'},
  safety: {es: 'Seguridad', en: 'Safety'}, building: {es: 'Edificio', en: 'Building'},
}

export async function generateStaticParams() {
  const slugs = await getSlugs()
  return slugs.flatMap((s) => locales.map((locale) => ({locale, section: sectionSlugs[s.listingType][locale], slug: s.slug})))
}

export async function generateMetadata({params}: {params: Params}): Promise<Metadata> {
  const {locale, section, slug} = await params
  if (!isLocale(locale)) return {}
  const type = sectionFromSlug(locale, section)
  if (!type) return {}
  const p = await getProperty(type, slug)
  if (!p) return {}
  const t = getDictionary(locale)
  const where = [p.propertyType && t.types[p.propertyType] && `${t.types[p.propertyType]} ${t.inPlace}`, loc(p.area, locale)].filter(Boolean).join(' ')
  const named = loc(p.title, locale)
  // Keep the title about 45 characters before the brand: the fullest version that fits, else a shorter one.
  const fits = [`${named} · ${where}`, `${named} · ${loc(p.area, locale)}`, named].find((c) => c.length <= 45) ?? named
  const title = loc(p.seo?.title, locale) || fits
  const price =
    type === 'vacation' && p.vacation?.nightlyRate ? `${t.from} ${formatMoney(p.vacation.nightlyRate, p.vacation.currency, locale)} ${t.perNight}`
    : type === 'rental' && p.rental?.monthlyRent ? `${formatMoney(p.rental.monthlyRent, p.rental.currency, locale)} ${t.perMonth}`
    : type === 'sale' && p.sale?.askingPrice ? formatMoney(p.sale.askingPrice, p.sale.currency, locale)
    : ''
  const description = loc(p.seo?.description, locale) || truncate([loc(p.summary, locale), price].filter(Boolean).join(' · '), 158)
  const paths = Object.fromEntries(locales.map((l) => [l, propertyPath(l, type, slug)])) as Record<Locale, string>
  return {
    title,
    description,
    robots: p.seo?.noIndex || p.isSample ? {index: false, follow: true} : undefined,
    alternates: {canonical: abs(paths[locale]), languages: languageAlternates(paths)},
    openGraph: {title, description, url: abs(paths[locale])},
  }
}

export default async function PropertyPage({params, searchParams}: {params: Params; searchParams: Search}) {
  const {locale, section, slug} = await params
  if (!isLocale(locale)) notFound()
  const type = sectionFromSlug(locale, section)
  if (!type) notFound()
  const [p, sec, settings] = await Promise.all([getProperty(type, slug), getSection(type), getSettings()])
  if (!p) notFound()
  const t = getDictionary(locale)
  const title = loc(p.title, locale)
  const body = (p.description?.[locale]?.length ? p.description[locale] : p.description?.es) as never
  const tax = settings.estimatedTaxPercent ?? 19
  const faqs = propertyFaqs(p, locale, title)

  const mobilePrice =
    type === 'vacation' && p.vacation?.nightlyRate ? <>{t.from} <Price amount={p.vacation.nightlyRate} currency={p.vacation.currency} /> {t.perNight}</>
    : type === 'rental' && p.rental?.monthlyRent ? <><Price amount={p.rental.monthlyRent} currency={p.rental.currency} /> {t.perMonth}</>
    : type === 'sale' && p.sale?.askingPrice ? <Price amount={p.sale.askingPrice} currency={p.sale.currency} />
    : null

  const grouped = new Map<string, NonNullable<PropertyDetail['amenities']>>()
  for (const a of p.amenities ?? []) grouped.set(a.category, [...(grouped.get(a.category) ?? []), a])

  const approx = p.location && !p.showExactPin ? {lat: Math.round(p.location.lat * 100) / 100, lng: Math.round(p.location.lng * 100) / 100} : p.location
  const crumbs = [
    {name: settings.siteName ?? 'Home', path: `/${locale}`},
    {name: loc(sec?.navLabel, locale), path: sectionPath(locale, type)},
    {name: title, path: propertyPath(locale, type, slug)},
  ]

  return (
    <div className="wrap">
      {!p.isSample && <JsonLd data={[propertyLd(p, locale, title), breadcrumbLd(crumbs), faqLd(faqs)].filter(Boolean)} />}
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={crumbs[0].path}>{crumbs[0].name}</Link> / <Link href={crumbs[1].path}>{crumbs[1].name}</Link> / <span aria-current="page">{title}</span>
      </nav>
      <div className="detail" data-type={type}>
        <article>
          {p.gallery?.length ? <Gallery photos={p.gallery} locale={locale} title={title} /> : null}
          {p.tour?.scenes?.length ? <TourLauncher tour={p.tour} locale={locale} title={title} bookLabel={t.cta[type]} /> : null}
          <h1>{title}</h1>
          <div className="facts">
            {p.isSample && <span className="badge dark">{t.sample}</span>}
            {loc(p.area, locale) && <span>{loc(p.area, locale)}</span>}
            {p.propertyType && <span>{t.types[p.propertyType]}</span>}
            {p.bedrooms !== undefined && p.propertyType !== 'land' && <span>{t.bedrooms(p.bedrooms)}</span>}
            {p.bathrooms ? <span>{t.baths(p.bathrooms)}</span> : null}
            {type !== 'sale' && p.maxGuests ? <span>{t.guests(p.maxGuests)}</span> : null}
            {p.builtAreaM2 ? <span>{p.builtAreaM2} m²</span> : null}
            {p.landAreaM2 ? <span>{t.land} {p.landAreaM2} m²</span> : null}
            {p.beachDistanceKm !== undefined && <span>{t.beach(p.beachDistanceKm)}</span>}
          </div>

          <section className="section prose" aria-labelledby="about">
            <h2 id="about">{t.about}</h2>
            <p>{loc(p.summary, locale)}</p>
            {body ? <PortableText value={body} /> : null}
          </section>

          {type === 'vacation' && p.vacation && (
            <section className="section" aria-labelledby="stay">
              <h2 id="stay">{locale === 'es' ? 'Tu estancia' : 'Your stay'}</h2>
              <dl className="lines" style={{maxWidth: 420}}>
                {p.vacation.minNights ? <div><dt>{locale === 'es' ? 'Estancia mínima' : 'Minimum stay'}</dt><dd>{t.nights(p.vacation.minNights)}</dd></div> : null}
                {p.vacation.checkInTime ? <div><dt>Check-in</dt><dd className="num">{p.vacation.checkInTime}</dd></div> : null}
                {p.vacation.checkOutTime ? <div><dt>Check-out</dt><dd className="num">{p.vacation.checkOutTime}</dd></div> : null}
                {p.vacation.cancellationPolicy ? <div><dt>{locale === 'es' ? 'Cancelación' : 'Cancellation'}</dt><dd>{({flexible: locale === 'es' ? 'Flexible' : 'Flexible', moderate: locale === 'es' ? 'Moderada' : 'Moderate', strict: locale === 'es' ? 'Estricta' : 'Strict'})[p.vacation.cancellationPolicy]}</dd></div> : null}
              </dl>
            </section>
          )}

          {type === 'sale' && p.sale && (
            <section className="section" aria-labelledby="sale">
              <h2 id="sale">{locale === 'es' ? 'Datos de la compra' : 'Buying details'}</h2>
              <dl className="lines" style={{maxWidth: 480}}>
                {p.sale.ownership && p.sale.ownership !== 'other' ? <div><dt>{locale === 'es' ? 'Titularidad' : 'Title'}</dt><dd>{t[p.sale.ownership]}</dd></div> : null}
                {p.sale.yearBuilt ? <div><dt>{locale === 'es' ? 'Año de construcción' : 'Year built'}</dt><dd className="num">{p.sale.yearBuilt}</dd></div> : null}
                {p.sale.annualPropertyTax ? <div><dt>Predial</dt><dd><Price amount={p.sale.annualPropertyTax} currency={p.sale.currency} />/{locale === 'es' ? 'año' : 'yr'}</dd></div> : null}
                {p.sale.financing?.length ? <div><dt>{locale === 'es' ? 'Financiamiento' : 'Financing'}</dt><dd>{p.sale.financing.join(', ')}</dd></div> : null}
                {p.sale.incomeEstimate?.monthlyRevenue ? <div><dt>{t.estYield} ({t.estimate})</dt><dd><Price amount={p.sale.incomeEstimate.monthlyRevenue} currency={p.sale.incomeEstimate.currency} />/{locale === 'es' ? 'mes' : 'mo'}</dd></div> : null}
              </dl>
            </section>
          )}

          {p.beds?.length ? (
            <section className="section" aria-labelledby="beds">
              <h2 id="beds">{t.beds}</h2>
              <div className="chips">{p.beds.map((b) => <span className="chip" key={b.type}>{b.count} × {t.bedTypes[b.type] ?? b.type}</span>)}</div>
            </section>
          ) : null}

          {grouped.size ? (
            <section className="section" aria-labelledby="amen">
              <h2 id="amen">{t.amenities}</h2>
              {[...grouped.entries()].map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="amen-cat">{CATEGORY[cat]?.[locale] ?? cat}</h3>
                  <ul className="amen-grid" style={{listStyle: 'none', padding: 0, margin: 0}}>
                    {items.map((a) => <li key={a.code}>{loc(a.label, locale)}{loc(a.detail, locale) ? <span className="muted"> · {loc(a.detail, locale)}</span> : null}</li>)}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          <FaqSection faqs={faqs} title={locale === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'} id="faq" />

          {approx ? (
            <section className="section" aria-labelledby="where">
              <h2 id="where">{t.where}</h2>
              <p className="muted" style={{margin: 0}}>{loc(p.area, locale)} · {t.whereNote}</p>
              <a href={`https://www.openstreetmap.org/?mlat=${approx.lat}&mlon=${approx.lng}#map=14/${approx.lat}/${approx.lng}`} target="_blank" rel="noopener noreferrer">OpenStreetMap ↗</a>
            </section>
          ) : null}
        </article>

        <aside aria-label={t.cta[type]}>
          <Suspense fallback={<div className="panel" aria-busy="true" style={{minHeight: 280}} />}>
            <Panel p={p} locale={locale} type={type} search={searchParams} tax={tax} whatsapp={settings.whatsapp} />
          </Suspense>
        </aside>
      </div>

      <div className="mobile-bar">
        <span><b>{mobilePrice}</b></span>
        <a className="btn" data-type={type} href="#reserve">{t.cta[type]}</a>
      </div>
    </div>
  )
}

async function Panel({p, locale, type, search, tax, whatsapp}: {p: PropertyDetail; locale: Locale; type: 'vacation' | 'rental' | 'sale'; search: Search; tax: number; whatsapp?: string}) {
  const sp = await search
  const g = Number(one(sp.guests))
  return (
    <ActionPanel
      propertyId={p._id}
      slug={p.slug}
      locale={locale}
      type={type}
      title={loc(p.title, locale)}
      vacation={p.vacation}
      rental={p.rental}
      sale={p.sale}
      maxGuests={p.maxGuests}
      whatsapp={p.agent?.whatsapp ?? whatsapp}
      taxPercent={tax}
      viewingModes={p.viewing?.modes?.length ? p.viewing.modes : ['in-person', 'video']}
      initial={{in: one(sp.in), out: one(sp.out), guests: Number.isFinite(g) && g > 0 ? g : undefined}}
    />
  )
}
