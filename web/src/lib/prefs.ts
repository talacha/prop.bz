'use client'

import {useSyncExternalStore} from 'react'

export type Currency = 'USD' | 'MXN'
export type Theme = 'light' | 'dark'

// Tiny external store over localStorage so every price and the menu stay in sync.
const listeners = new Set<() => void>()
const read = (key: string): string | null => {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode: keep working without persistence */
  }
  listeners.forEach((l) => l())
}
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}

/** Spanish visitors see pesos, English visitors see dollars, until they choose. */
export const defaultCurrencyFor = (locale: 'es' | 'en'): Currency => (locale === 'es' ? 'MXN' : 'USD')

export function useCurrency(locale: 'es' | 'en'): [Currency, (c: Currency) => void] {
  const fallback = defaultCurrencyFor(locale)
  const value = useSyncExternalStore(subscribe, () => (read('currency') === 'USD' || read('currency') === 'MXN' ? (read('currency') as Currency) : fallback), () => fallback)
  return [value, (c) => write('currency', c)]
}

/** The visitor's explicit theme choice, or null while following the operating system. */
export function useThemeChoice(): [Theme | null, (t: Theme) => void] {
  const value = useSyncExternalStore(subscribe, () => (read('theme') === 'light' || read('theme') === 'dark' ? (read('theme') as Theme) : null), () => null)
  return [
    value,
    (t) => {
      document.documentElement.dataset.theme = t
      write('theme', t)
    },
  ]
}

const query = () => window.matchMedia('(prefers-color-scheme: dark)')
/** The theme actually on screen (explicit choice, otherwise the OS setting). */
export function useEffectiveTheme(): Theme {
  const [choice] = useThemeChoice()
  const system = useSyncExternalStore(
    (cb) => { const q = query(); q.addEventListener('change', cb); return () => q.removeEventListener('change', cb) },
    () => (query().matches ? 'dark' : 'light'),
    () => 'light',
  ) as Theme
  return choice ?? system
}

export const setLocaleCookie = (locale: string) => {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`
}
