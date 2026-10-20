import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PropertyCard} from '@/components/PropertyCard'
import {isLocale, listingTypes, sectionPath} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {getFeatured, getSection, getSettings} from '@/sanity/fetch'

export default async function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale)
  const [settings, sections, featured] = await Promise.all([
    getSettings(),
    Promise.all(listingTypes.map((ty) => getSection(ty))),
    Promise.all(listingTypes.map((ty) => getFeatured(ty))),
  ])
  const tax = settings.estimatedTaxPercent ?? 19

  return (
    <>
      <section className="hero">
        <h1>{loc(settings.tagline, locale)}</h1>
        <p>{settings.trustPoints?.map((p) => loc(p, locale)).join(' · ')}</p>
      </section>

      <section className="tiles" aria-label={t.findByPersona}>
        {sections.map((s, i) =>
          s ? (
            <Link key={s.sectionType} href={sectionPath(locale, s.sectionType)} className="tile" data-type={s.sectionType}>
              <h2>{loc(s.navLabel, locale)}</h2>
              <p>{loc(s.tagline, locale)}</p>
              <span className="go">{loc(s.primaryCta, locale) || t.cta[listingTypes[i]]} →</span>
            </Link>
          ) : null,
        )}
      </section>

      <section className="block" aria-labelledby="who">
        <div className="block-head"><h2 id="who">{t.findByPersona}</h2></div>
        <div className="persona-row">
          {sections.map((s) =>
            s?.personas?.length ? (
              <div key={s.sectionType}>
                <strong>{loc(s.navLabel, locale)}</strong>
                <div className="chips">
                  {s.personas.map((p) => (
                    <Link key={p._id} className="pill" href={`${sectionPath(locale, s.sectionType)}?persona=${p.slug}`}>{loc(p.title, locale)}</Link>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </section>

      {sections.map((s, i) =>
        s && featured[i].length ? (
          <section className="block" key={s.sectionType} aria-labelledby={`f-${s.sectionType}`}>
            <div className="block-head">
              <h2 id={`f-${s.sectionType}`}>{loc(s.title, locale)}</h2>
              <Link className="pill" href={sectionPath(locale, s.sectionType)}>{loc(s.navLabel, locale)} →</Link>
            </div>
            <div className="grid">
              {featured[i].map((p) => <PropertyCard key={p._id} p={p} locale={locale} taxPercent={tax} />)}
            </div>
          </section>
        ) : null,
      )}
    </>
  )
}
