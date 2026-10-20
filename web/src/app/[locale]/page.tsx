import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {FaqSection} from '@/components/FaqSection'
import {Finder} from '@/components/Finder'
import {JsonLd} from '@/components/JsonLd'
import {Photo} from '@/components/Photo'
import {PropertyCard} from '@/components/PropertyCard'
import {isLocale, listingTypes, locales, propertyPath, sectionPath, type ListingType} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {homeFaqs} from '@/lib/faq'
import {faqLd} from '@/lib/jsonld'
import {abs, languageAlternates} from '@/lib/site'
import {getFeatured, getSection, getSettings, getTours} from '@/sanity/fetch'

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params
  if (!isLocale(locale)) return {}
  const s = await getSettings()
  const name = s.siteName ?? 'Property Business SaaS Demo'
  const title = locale === 'es' ? `Hospédate, renta o compra en Playa del Carmen · ${name}` : `Stay, rent or buy in Playa del Carmen · ${name}`
  const description = locale === 'es'
    ? 'Reserva directo estancias vacacionales, rentas de 1 a 11 meses y propiedades en venta en Playa del Carmen y Playacar. Sin cuota de servicio.'
    : 'Book vacation stays, 1 to 11 month rentals and properties for sale in Playa del Carmen and Playacar, direct. No service fee.'
  const paths = Object.fromEntries(locales.map((l) => [l, `/${l}`])) as Record<'es' | 'en', string>
  return {title: {absolute: title}, description, alternates: {canonical: abs(`/${locale}`), languages: languageAlternates(paths)}, openGraph: {title, description, url: abs(`/${locale}`)}}
}

const ICONS = [
  <path key="a" d="M12 2v20M17 6.5C16 5 14.3 4.5 12 4.5c-2.8 0-4.5 1.2-4.5 3S9 10.4 12 11s4.5 1.7 4.5 3.5-1.7 3-4.5 3c-2.4 0-4.2-.6-5.2-2.2" />,
  <g key="b"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18" /></g>,
  <path key="c" d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
  <path key="d" d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 6 6 8M12 5c-.5 3-3 6.5-8 9M13 20l4-9 4 9M14.5 17h5" />,
]

export default async function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale)
  const [settings, sections, featured, tours] = await Promise.all([
    getSettings(),
    Promise.all(listingTypes.map((ty) => getSection(ty))),
    Promise.all(listingTypes.map((ty) => getFeatured(ty))),
    getTours(),
  ])
  const tax = settings.estimatedTaxPercent ?? 19
  const faqs = homeFaqs(locale)
  // The hero photograph is the cover of the first featured stay (the owners control it by picking which stay is featured).
  const heroPhoto = featured[0]?.[0]?.photos?.[0]
  const personas = Object.fromEntries(
    listingTypes.map((ty, i) => [ty, (sections[i]?.personas ?? []).map((p) => ({slug: p.slug, title: loc(p.title, locale)}))]),
  ) as Record<ListingType, {slug: string; title: string}[]>

  return (
    <>
      <JsonLd data={faqLd(faqs)} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media">
          {heroPhoto && <Photo photo={heroPhoto} locale={locale} sizes="100vw" priority quality={60} />}
        </div>
        <div className="wrap hero-in">
          <span className="eyebrow">{t.heroEyebrow}</span>
          <h1 id="hero-title">{t.heroLead} <em>{t.heroEm}</em></h1>
          <p className="hero-sub">{t.heroSub}</p>
        </div>
      </section>

      <div className="wrap finder-wrap">
        <Finder locale={locale} personas={personas} />
      </div>

      <div className="wrap">
        <ul className="trust">
          {t.trust.map(([title, sub], i) => (
            <li key={title}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i]}</svg>
              <p style={{margin: 0}}><b>{title}</b><span>{sub}</span></p>
            </li>
          ))}
        </ul>

        {sections.map((s, i) =>
          s && listingTypes[i] === 'vacation' && featured[i].length ? <Rail key={s.sectionType} s={s} items={featured[i]} locale={locale} tax={tax} /> : null,
        )}
      </div>

      {tours.length > 0 && (
        <section className="tour-band" id="tours" aria-labelledby="tours-title">
          <div className="wrap">
            <div className="sec-head">
              <div><h2 id="tours-title">{t.toursTitle}</h2><p>{t.toursSub}</p></div>
            </div>
            <div className="tiles" data-n={tours.length}>
              {tours.map((p) => (
                <Link key={p._id} className="tile" href={`${propertyPath(locale, p.listingType, p.slug)}?tour=1`}>
                  <span className="tile-media">{p.photos[0] && <Photo photo={p.photos[0]} locale={locale} sizes="(max-width: 760px) 86vw, 580px" alt="" ratio="16:10" quality={60} />}</span>
                  <span className="tile-deg">360°</span>
                  <span className="tile-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                  <span className="tile-text">
                    <b>{loc(p.title, locale)}</b>
                    <span>{t.tourRooms(p.tourRooms ?? 0)} · {loc(p.area, locale)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        {sections.map((s, i) =>
          s && listingTypes[i] !== 'vacation' && featured[i].length ? <Rail key={s.sectionType} s={s} items={featured[i]} locale={locale} tax={tax} /> : null,
        )}

        <section className="sec" aria-labelledby="how-title">
          <div className="sec-head"><div><h2 id="how-title">{t.howTitle}</h2></div></div>
          <ol className="steps">
            {t.how.map(([title, body]) => (
              <li className="step" key={title}><h3>{title}</h3><p>{body}</p></li>
            ))}
          </ol>
        </section>

        <FaqSection faqs={faqs} title={locale === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'} id="faq" />
      </div>
    </>
  )
}

function Rail({s, items, locale, tax}: {s: NonNullable<Awaited<ReturnType<typeof getSection>>>; items: Awaited<ReturnType<typeof getFeatured>>; locale: 'es' | 'en'; tax: number}) {
  const t = getDictionary(locale)
  return (
    <section className="sec" id={s.sectionType} aria-labelledby={`h-${s.sectionType}`}>
      <div className="sec-head">
        <div><h2 id={`h-${s.sectionType}`}>{loc(s.title, locale)}</h2><p>{loc(s.tagline, locale)}</p></div>
        <Link className="more" href={sectionPath(locale, s.sectionType)}>{t.seeAll} →</Link>
      </div>
      <div className="rail">
        {items.map((p) => <PropertyCard key={p._id} p={p} locale={locale} taxPercent={tax} headingLevel={3} />)}
      </div>
    </section>
  )
}
