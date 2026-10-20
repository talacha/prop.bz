'use client'

import Link from 'next/link'
import {usePathname, useSearchParams} from 'next/navigation'
import {useEffect, useId, useRef, useState} from 'react'
import {listingTypes, sectionSlugs, type Locale} from '@/i18n/config'
import {getDictionary} from '@/i18n/dictionary'
import {setLocaleCookie, useCurrency, useEffectiveTheme, useThemeChoice, type Currency, type Theme} from '@/lib/prefs'
import {usePrefsContext} from './PrefsProvider'

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const Moon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)
const Gear = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

/** Preferences: currency, language and theme in one disclosure. */
export function PreferencesMenu({locale}: {locale: Locale}) {
  const t = getDictionary(locale)
  const {fx} = usePrefsContext()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const [currency, setCurrency] = useCurrency(locale)
  const [, setTheme] = useThemeChoice()
  const theme = useEffectiveTheme()
  const path = usePathname()
  const sp = useSearchParams()

  // Close on Escape (focus returns to the button) and on any click or focus outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    const onPointer = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('focusin', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); document.removeEventListener('focusin', onPointer) }
  }, [open])

  // Same page in the other language: swap the locale and the localized section segment, keep the query.
  const hrefFor = (target: Locale) => {
    const parts = path.split('/').filter(Boolean)
    parts[0] = target
    if (parts[1]) {
      const ty = listingTypes.find((x) => sectionSlugs[x][locale] === parts[1])
      if (ty) parts[1] = sectionSlugs[ty][target]
    }
    const qs = sp.toString()
    return `/${parts.join('/')}${qs ? `?${qs}` : ''}`
  }

  const seg = (on: boolean) => ({'aria-pressed': on, className: 'seg-btn'}) as const

  return (
    <div className="prefs" ref={root}>
      <button ref={button} type="button" className="pill prefs-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <Gear />
        <span className="prefs-label">{t.prefs}</span>
        <span className="sr-only prefs-sr">{t.prefs}</span>
      </button>
      {open && (
        <div id={panelId} className="prefs-panel" role="group" aria-label={t.prefs}>
          <div className="prefs-row">
            <span className="prefs-name" id={`${panelId}-cur`}>{t.prefsCurrency}</span>
            <div className="seg-group" role="group" aria-labelledby={`${panelId}-cur`}>
              {(['USD', 'MXN'] as Currency[]).map((c) => (
                <button key={c} type="button" {...seg(currency === c)} onClick={() => setCurrency(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="prefs-row">
            <span className="prefs-name" id={`${panelId}-lang`}>{t.prefsLanguage}</span>
            <div className="seg-group" role="group" aria-labelledby={`${panelId}-lang`}>
              {(['es', 'en'] as Locale[]).map((l) => (
                <Link key={l} href={hrefFor(l)} hrefLang={l} lang={l} className="seg-btn" aria-current={l === locale ? 'true' : undefined} onClick={() => setLocaleCookie(l)}>
                  {l === 'es' ? 'Español' : 'English'}
                </Link>
              ))}
            </div>
          </div>
          <div className="prefs-row">
            <span className="prefs-name" id={`${panelId}-theme`}>{t.prefsTheme}</span>
            <div className="seg-group" role="group" aria-labelledby={`${panelId}-theme`}>
              {(['light', 'dark'] as Theme[]).map((th) => (
                <button key={th} type="button" {...seg(theme === th)} onClick={() => setTheme(th)}>
                  {th === 'light' ? <Sun /> : <Moon />}
                  <span>{th === 'light' ? t.themeLight : t.themeDark}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="prefs-note">{t.fxNote(fx)}</p>
        </div>
      )}
    </div>
  )
}
