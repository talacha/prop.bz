'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Carousel, type CarouselLabels} from './Carousel'
import type {SanityPhoto} from '@/sanity/image'
import {getDictionary} from '@/i18n/dictionary'
import type {Locale} from '@/i18n/config'


/** Inline carousel with thumbnails, plus a full-screen lightbox built on the native <dialog>
 *  (focus trap, Escape to close, and focus returned to the trigger all come from the platform). */
export function Gallery({photos, locale, title}: {photos: SanityPhoto[]; locale: Locale; title: string}) {
  const t = getDictionary(locale)
  const labels = useMemo(
    () => ({label: `${t.gallery}: ${title}`, prev: t.prev, next: t.next, help: t.carouselHelp, photoOf: t.photoOf, open: t.openGallery, close: t.closeGallery, title: `${t.gallery}: ${title}`}),
    [t, title],
  )
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const carouselLabels = useMemo<CarouselLabels>(
    () => ({label: labels.label, prev: labels.prev, next: labels.next, help: labels.help, photoOf: labels.photoOf}),
    [labels],
  )

  const openBox = useCallback(() => {
    dialogRef.current?.showModal()
    setOpen(true)
  }, [])
  const closeBox = useCallback(() => dialogRef.current?.close(), [])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    const onClose = () => setOpen(false)
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  return (
    <>
      <Carousel
        photos={photos}
        locale={locale}
        labels={carouselLabels}
        altBase={title}
        index={index}
        onIndexChange={setIndex}
        sizes="(max-width: 960px) 100vw, 780px"
        onExpand={openBox}
        expandLabel={labels.open}
      />
      <p className="hint kb">{labels.help}</p>
      <dialog ref={dialogRef} className="lightbox" aria-label={labels.title}>
        {open && (
          <div className="lb-inner">
            <div className="lb-bar">
              <span className="num">{labels.photoOf(index + 1, photos.length)}</span>
              <button type="button" className="lb-close" onClick={closeBox}>{labels.close}</button>
            </div>
            <Carousel
              photos={photos}
              locale={locale}
              labels={carouselLabels}
              altBase={title}
              index={index}
              onIndexChange={setIndex}
              sizes="100vw"
              fit="contain"
              showThumbs={false}
              autoFocus
              fillHeight
            />
            <span className="sr-only">{labels.help}</span>
          </div>
        )}
      </dialog>
    </>
  )
}
