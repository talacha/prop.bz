'use client'

import {useCallback, useEffect, useId, useRef} from 'react'
import {Photo} from './Photo'
import type {SanityPhoto} from '@/sanity/image'
import type {Locale} from '@/i18n/config'
import {loc} from '@/i18n/dictionary'

export type CarouselLabels = {
  label: string
  prev: string
  next: string
  help: string
  photoOf: (i: number, n: number) => string
}

/**
 * Photo carousel (up to 20 slides).
 *  - Touch: native horizontal scroll-snap, so thumb swipes get momentum and snap for free.
 *  - Keyboard: the carousel is focusable; Left/Right change photo, Home/End jump. Buttons are real buttons.
 *  - Screen readers: carousel/slide roles, a polite live region announcing "Photo 3 of 20".
 *  - No autoplay, reduced-motion aware.
 */
export function Carousel({photos, locale, labels, altBase, index, onIndexChange, sizes, showThumbs = true, fit = 'cover', autoFocus, onExpand, expandLabel, fillHeight}: {
  photos: SanityPhoto[]
  locale: Locale
  labels: CarouselLabels
  altBase: string
  index: number
  onIndexChange: (i: number) => void
  sizes: string
  showThumbs?: boolean
  fit?: 'cover' | 'contain'
  autoFocus?: boolean
  onExpand?: () => void
  expandLabel?: string
  fillHeight?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  // While a button/key-driven scroll animates, ignore scroll events until it arrives at the target slide.
  const programmatic = useRef(false)
  const target = useRef(0)
  const unlock = useRef(0)
  const helpId = useId()
  const n = photos.length

  const goTo = useCallback((i: number, smooth = true) => {
    const track = trackRef.current
    if (!track || n === 0) return
    const next = Math.max(0, Math.min(n - 1, i))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    programmatic.current = true
    target.current = next
    track.scrollTo({left: next * track.clientWidth, behavior: smooth && !reduce ? 'smooth' : 'auto'})
    onIndexChange(next)
    window.clearTimeout(unlock.current)
    unlock.current = window.setTimeout(() => (programmatic.current = false), 2000) // safety net only
  }, [n, onIndexChange])

  // Keep the index in sync with swipes: scroll position is the source of truth.
  const onScroll = () => {
    const t = trackRef.current
    if (programmatic.current) {
      if (t && Math.abs(t.scrollLeft - target.current * t.clientWidth) < 2) programmatic.current = false
      return
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const t = trackRef.current
      if (!t || !t.clientWidth) return
      const i = Math.round(t.scrollLeft / t.clientWidth)
      if (i !== index) onIndexChange(i)
    })
  }

  // Jump (without animation) when the parent changes the index, e.g. opening the lightbox on photo 7.
  useEffect(() => {
    const t = trackRef.current
    if (t && t.clientWidth && Math.round(t.scrollLeft / t.clientWidth) !== index && !programmatic.current) goTo(index, false)
  }, [index, goTo])

  // Announced by the polite live region whenever the index changes.
  const live = labels.photoOf(index + 1, n)

  useEffect(() => {
    if (autoFocus) rootRef.current?.focus()
  }, [autoFocus])

  // Keep the current slide aligned on resize/rotation. Only react to real width changes:
  // a ResizeObserver also fires once when it starts observing, which would fight a swipe in progress.
  const indexRef = useRef(index)
  useEffect(() => {
    indexRef.current = index
  }, [index])
  useEffect(() => {
    const t = trackRef.current
    if (!t) return
    let lastWidth = t.clientWidth
    const ro = new ResizeObserver(() => {
      if (t.clientWidth === lastWidth) return
      lastWidth = t.clientWidth
      t.scrollLeft = indexRef.current * t.clientWidth
    })
    ro.observe(t)
    return () => ro.disconnect()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Keys only act on the carousel itself, never on the buttons inside it.
    if (e.target !== e.currentTarget) return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    if (e.key === 'ArrowRight') goTo(index + (rtl ? -1 : 1))
    else if (e.key === 'ArrowLeft') goTo(index + (rtl ? 1 : -1))
    else if (e.key === 'Home') goTo(0)
    else if (e.key === 'End') goTo(n - 1)
    else return
    e.preventDefault()
  }

  if (n === 0) return null

  return (
    <div className="gallery" style={fillHeight ? {height: '100%', gridTemplateRows: '1fr'} : undefined}>
      <div
        ref={rootRef}
        className="carousel"
        data-fit={fit}
        role="region"
        aria-roledescription="carousel"
        aria-label={labels.label}
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div ref={trackRef} className="track" onScroll={onScroll} onTouchStart={() => (programmatic.current = false)} onWheel={() => (programmatic.current = false)}>
          {photos.map((p, i) => (
            <div
              key={p.id + i}
              className="slide"
              role="group"
              aria-roledescription="slide"
              aria-label={labels.photoOf(i + 1, n)}
              aria-hidden={Math.abs(i - index) > 1 ? true : undefined}
              onClick={onExpand}
              style={{
                ...(onExpand ? {cursor: 'zoom-in'} : {}),
                // Slides far from the current one stay empty (just the blurred preview) so a 20-photo gallery
                // does not download 20 images up front. Swiping prefetches the next ones.
                ...(Math.abs(i - index) > 2 && p.lqip ? {backgroundImage: `url(${p.lqip})`, backgroundSize: 'cover'} : {}),
              }}
            >
              {Math.abs(i - index) <= 2 ? <Photo photo={p} locale={locale} sizes={sizes} priority={i === 0 && index === 0} fit={fit} alt={loc(p.alt, locale) || `${altBase} · ${labels.photoOf(i + 1, n)}`} /> : null}
            </div>
          ))}
        </div>

        {n > 1 && (
          <>
            <button type="button" className="nav-btn prev" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={labels.prev}>
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" className="nav-btn next" onClick={() => goTo(index + 1)} disabled={index === n - 1} aria-label={labels.next}>
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}
        <div className="counter num" aria-hidden="true">{index + 1} / {n}</div>
        {onExpand && (
          <button type="button" className="expand" onClick={onExpand}>{expandLabel}</button>
        )}
        <span id={helpId} className="sr-only">{labels.help}</span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{live}</span>
      </div>

      {showThumbs && n > 1 && (
        <div className="thumbs" role="group" aria-label={labels.label}>
          {photos.map((p, i) => (
            <button
              key={p.id + i}
              type="button"
              className="thumb"
              aria-current={i === index}
              aria-label={labels.photoOf(i + 1, n)}
              onClick={() => goTo(i)}
              tabIndex={i === index ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const next = i + (e.key === 'ArrowRight' ? 1 : -1)
                  if (next >= 0 && next < n) {
                    goTo(next)
                    ;(e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
                    e.preventDefault()
                  }
                }
              }}
            >
              <Photo photo={p} locale={locale} sizes="84px" alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
