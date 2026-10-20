import Link from 'next/link'
import {getSection, getSectionsNav} from '@/sanity/fetch'
import {listingTypes, sectionPath, type ListingType, type Locale} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {Suspense} from 'react'
import {LocaleSwitch} from './LocaleSwitch'
import {NavLink} from './NavLink'

/** Top-level navigation: one tab per property type, a persona finder, and the language switch. */
export async function SiteHeader({locale}: {locale: Locale}) {
  const t = getDictionary(locale)
  const [nav, sections] = await Promise.all([getSectionsNav(), Promise.all(listingTypes.map((ty) => getSection(ty)))])
  const label = (ty: ListingType) => loc(nav.find((n) => n.sectionType === ty)?.navLabel, locale)

  return (
    <header className="top">
      <div className="wrap top-row">
        <Link href={`/${locale}`} className="brand">A Toda Madre <span>Direct</span></Link>
        <nav className="nav" aria-label="Main">
          {listingTypes.map((ty) => (
            <NavLink key={ty} href={sectionPath(locale, ty)} type={ty}>{label(ty) || ty}</NavLink>
          ))}
        </nav>
        <div className="top-tools">
          <details className="menu">
            <summary>{t.findByPersona}</summary>
            <div className="menu-panel">
              {sections.map((s) =>
                s && s.personas?.length ? (
                  <div key={s.sectionType}>
                    <h3>{loc(s.navLabel, locale)}</h3>
                    <div className="chips">
                      {s.personas.map((p) => (
                        <Link key={p._id} className="pill" href={`${sectionPath(locale, s.sectionType)}?persona=${p.slug}`}>{loc(p.title, locale)}</Link>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          </details>
          <Suspense fallback={<span className="pill">{t.lang}</span>}><LocaleSwitch locale={locale} label={t.lang} /></Suspense>
        </div>
      </div>
    </header>
  )
}
