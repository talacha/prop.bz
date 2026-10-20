import type {Metadata, Viewport} from 'next'
import {Bricolage_Grotesque, Figtree} from 'next/font/google'
import {notFound} from 'next/navigation'
import {preconnect} from 'react-dom'
import Link from 'next/link'
import {Suspense} from 'react'
import {BrandMark, BrandName} from '@/components/BrandMark'
import {CurrentYear} from '@/components/CurrentYear'
import {JsonLd} from '@/components/JsonLd'
import {PrefsProvider} from '@/components/PrefsProvider'
import {SiteHeader} from '@/components/SiteHeader'
import {isLocale, listingTypes, locales, sectionPath, type Locale} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {organizationLd, websiteLd} from '@/lib/jsonld'
import {OG_LOCALE, PLACE, SITE_URL} from '@/lib/site'
import {getSection, getSettings} from '@/sanity/fetch'
import '../globals.css'

const display = Bricolage_Grotesque({subsets: ['latin'], variable: '--font-bricolage', display: 'swap'})
const body = Figtree({subsets: ['latin'], variable: '--font-figtree', display: 'swap'})

export const generateStaticParams = () => locales.map((locale) => ({locale}))

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f4f7f6'},
    {media: '(prefers-color-scheme: dark)', color: '#0a1820'},
  ],
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params
  if (!isLocale(locale)) return {}
  const s = await getSettings()
  const name = s.siteName ?? 'Property Business SaaS Demo'
  const other: Locale = locale === 'es' ? 'en' : 'es'
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: name,
    title: {default: name, template: `%s · ${name}`},
    description: loc(s.tagline, locale),
    manifest: '/manifest.webmanifest',
    category: 'real estate',
    referrer: 'strict-origin-when-cross-origin',
    formatDetection: {telephone: false},
    openGraph: {type: 'website', siteName: name, locale: OG_LOCALE[locale], alternateLocale: [OG_LOCALE[other]]},
    twitter: {card: 'summary_large_image'},
    robots: {index: true, follow: true, googleBot: {index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1}},
    // Local SEO hints for engines that still read them
    other: {
      'geo.region': PLACE.regionCode,
      'geo.placename': PLACE.locality,
      'geo.position': `${PLACE.lat};${PLACE.lng}`,
      ICBM: `${PLACE.lat}, ${PLACE.lng}`,
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? {'msvalidate.01': process.env.BING_SITE_VERIFICATION} : undefined,
    },
  }
}

export default async function RootLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!isLocale(locale)) notFound()
  preconnect('https://cdn.sanity.io', {crossOrigin: 'anonymous'}) // photos come from Sanity's CDN
  const t = getDictionary(locale)
  const [s, sections] = await Promise.all([getSettings(), Promise.all(listingTypes.map((ty) => getSection(ty)))])
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a saved light/dark choice before first paint so there is no flash. Without one, the OS setting applies via CSS. */}
        <script dangerouslySetInnerHTML={{__html: "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}"}} />
      </head>
      <body>
        <PrefsProvider fx={s.usdToMxn ?? 18.5} locale={locale}>
        <JsonLd data={[organizationLd(s, locale), websiteLd(s, locale)]} />
        <a className="skip" href="#main">{t.skip}</a>
        <Suspense fallback={null}>
          <SiteHeader locale={locale} />
        </Suspense>
        <main id="main">{children}</main>
        <footer className="footer">
          <div className="wrap">
            <div className="foot-grid">
              <div>
                <Link href={`/${locale}`} className="brand"><BrandMark /><BrandName name={s.siteName ?? ''} /></Link>
                <p style={{margin: 0, maxWidth: '30ch'}}>{loc(s.tagline, locale)}</p>
              </div>
              <nav aria-label={t.explore}>
                <h2>{t.explore}</h2>
                {listingTypes.map((ty, i) => <Link key={ty} href={sectionPath(locale, ty)}>{loc(sections[i]?.navLabel, locale)}</Link>)}
                <Link href={`/${locale}#tours`}>{t.tour}</Link>
              </nav>
              <nav aria-label={t.legal}>
                <h2>{t.legal}</h2>
                {t.legalLinks.map(([slug, label]) => <Link key={slug} href={`/${locale}/info/${slug}`}>{label}</Link>)}
                {s.whatsapp ? <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
              </nav>
              <div>
                <h2>{t.goodToKnow}</h2>
                {t.trust.map(([title]) => <span key={title} style={{display: 'block', padding: '5px 0'}}>{title}</span>)}
              </div>
            </div>
            <small className="foot-fine">© <CurrentYear fallback={2026} /> {s.legalEntity ?? s.siteName}</small>
          </div>
        </footer>
        </PrefsProvider>
      </body>
    </html>
  )
}
