'use client'

import Image from 'next/image'
import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react'
import type {Locale} from '@/i18n/config'
import {getDictionary} from '@/i18n/dictionary'
import {assetUrl} from '@/sanity/image'
import type {TourData} from '@/sanity/types'

// The viewer (and its WebGL code) is only downloaded when someone starts or hovers the tour.
const loadViewer = () => import('./PanoViewer')
const PanoViewer = lazy(loadViewer)

/**
 * The tour call-to-action under the gallery, and the full-screen dialog that hosts the viewer.
 * "Book a viewing" is always inside the tour: it closes the tour and brings the booking panel into view.
 */
export function TourLauncher({tour, locale, title, bookLabel}: {tour: TourData; locale: Locale; title: string; bookLabel: string}) {
  const t = getDictionary(locale)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const first = tour.scenes[0]

  const warm = useCallback(() => {
    void loadViewer()
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = `${assetUrl(first.image)}?w=1024&q=70&auto=format`
  }, [first.image])

  const start = () => {
    dialog.current?.showModal()
    setOpen(true)
  }
  const close = useCallback(() => dialog.current?.close(), [])
  const book = useCallback(() => {
    dialog.current?.close()
    // Wait one frame so the page is scrollable again, then jump to the booking panel.
    requestAnimationFrame(() => {
      const panel = document.getElementById('reserve')
      panel?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'})
      panel?.querySelector<HTMLElement>('button.slot, input, select')?.focus({preventScroll: true})
    })
  }, [])

  // Shared links like /…?tour=1 open the tour straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tour') !== '1') return
    const raf = requestAnimationFrame(() => start())
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const onClose = () => { setOpen(false); trigger.current?.focus() }
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  return (
    <>
      <button ref={trigger} type="button" className="tour-card" onClick={start} onPointerEnter={warm} onFocus={warm}>
        <span className="tour-card-media">
          <Image src={`${assetUrl(first.image)}`} alt="" fill sizes="(max-width: 960px) 100vw, 780px" quality={60} style={{objectFit: 'cover'}} />
          <span className="tour-card-badge">360°</span>
        </span>
        <span className="tour-card-body">
          <strong>{t.tour}</strong>
          <span>{t.tourRooms(tour.scenes.length)} · {t.tourSeen}</span>
          <span className="tour-card-cta">{t.tourStart} →</span>
        </span>
      </button>
      <dialog ref={dialog} className="tour-dialog" aria-label={`${t.tour}: ${title}`}>
        {open && (
          <Suspense fallback={<div className="tour-status" role="status">{t.tourLoading}</div>}>
            <PanoViewer tour={tour} locale={locale} title={title} onClose={close} onBook={book} bookLabel={bookLabel} />
          </Suspense>
        )}
      </dialog>
    </>
  )
}
