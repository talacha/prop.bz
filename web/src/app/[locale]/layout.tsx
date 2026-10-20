import type {Metadata} from 'next'
import {Bricolage_Grotesque, Figtree} from 'next/font/google'
import {notFound} from 'next/navigation'
import {Suspense} from 'react'
import {SiteHeader} from '@/components/SiteHeader'
import {isLocale, locales} from '@/i18n/config'
import {getDictionary, loc} from '@/i18n/dictionary'
import {getSettings} from '@/sanity/fetch'
import '../globals.css'

const display = Bricolage_Grotesque({subsets: ['latin'], variable: '--font-bricolage', display: 'swap'})
const body = Figtree({subsets: ['latin'], variable: '--font-figtree', display: 'swap'})

export const generateStaticParams = () => locales.map((locale) => ({locale}))

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params
  if (!isLocale(locale)) return {}
  const s = await getSettings()
  return {
    title: {default: s.siteName ?? 'A Toda Madre', template: `%s · ${s.siteName ?? 'A Toda Madre'}`},
    description: loc(s.tagline, locale),
    alternates: {languages: {es: '/es', en: '/en'}},
  }
}

export default async function RootLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale)
  const s = await getSettings()
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip" href="#main">{t.skip}</a>
        <Suspense fallback={null}>
          <SiteHeader locale={locale} />
        </Suspense>
        <main id="main" className="wrap">{children}</main>
        <footer className="wrap footer">
          <div>{s.legalEntity ?? s.siteName}</div>
          {s.trustPoints?.length ? <div>{s.trustPoints.map((p) => loc(p, locale)).join(' · ')}</div> : null}
        </footer>
      </body>
    </html>
  )
}
