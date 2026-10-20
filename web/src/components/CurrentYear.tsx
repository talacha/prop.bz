'use client'

import {useSyncExternalStore} from 'react'

const noop = () => () => {}
/** The year can change between the static build and a visit, so it is read in the browser (the server snapshot is the build year). */
export function CurrentYear({fallback}: {fallback: number}) {
  const year = useSyncExternalStore(noop, () => new Date().getFullYear(), () => fallback)
  return <>{year}</>
}
