'use client'

import {createContext, useCallback, useContext, type ReactNode} from 'react'
import type {Locale} from '@/i18n/config'
import {formatMoney} from '@/i18n/dictionary'
import {useCurrency, type Currency} from '@/lib/prefs'

type Ctx = {fx: number; locale: Locale}
const PrefsContext = createContext<Ctx>({fx: 18.5, locale: 'es'})

export function PrefsProvider({fx, locale, children}: {fx: number; locale: Locale; children: ReactNode}) {
  return <PrefsContext.Provider value={{fx, locale}}>{children}</PrefsContext.Provider>
}

export const usePrefsContext = () => useContext(PrefsContext)

/** Converts an amount from the listing's currency into the visitor's chosen currency. Display only. */
export function convert(amount: number, from: Currency, to: Currency, fx: number): number {
  if (from === to) return amount
  return from === 'USD' ? amount * fx : amount / fx
}

/** Formatter that follows the currency preference. Returns text like "≈ MX$1,480" when converted. */
export function useMoney() {
  const {fx, locale} = usePrefsContext()
  const [target] = useCurrency(locale)
  return useCallback(
    (amount: number, from: Currency) => {
      if (from === target) return formatMoney(amount, from, locale)
      return `≈ ${formatMoney(Math.round(convert(amount, from, target, fx)), target, locale)}`
    },
    [fx, locale, target],
  )
}

/**
 * A price that follows the currency preference. Server-rendered in the locale's default currency
 * (no flash for most visitors); switches after hydration if the visitor chose the other one.
 */
export function Price({amount, currency, original = false}: {amount: number; currency: Currency; original?: boolean}) {
  const {fx, locale} = usePrefsContext()
  const [target] = useCurrency(locale)
  const converted = target !== currency
  const text = converted ? `≈ ${formatMoney(Math.round(convert(amount, currency, target, fx)), target, locale)}` : formatMoney(amount, currency, locale)
  return (
    <>
      <span className="num" title={converted ? `1 USD ≈ ${fx} MXN` : undefined}>{text}</span>
      {original && converted ? <span className="price-orig num"> ({formatMoney(amount, currency, locale)})</span> : null}
    </>
  )
}
