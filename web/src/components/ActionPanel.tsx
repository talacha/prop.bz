'use client'

import Link from 'next/link'
import {useMemo, useState, useSyncExternalStore} from 'react'
import type {Locale, ListingType} from '@/i18n/config'
import {getDictionary} from '@/i18n/dictionary'
import {useMoney} from './PrefsProvider'
import {estimateStay, nightsBetween} from '@/lib/pricing'
import type {RequestPayload} from '@/lib/requests'
import type {RentalTerms, SaleTerms, VacationTerms} from '@/sanity/types'

type Common = {
  propertyId: string
  slug: string
  locale: Locale
  type: ListingType
  title: string
  viewingModes: string[]
}
type Props = Common & {
  vacation?: VacationTerms
  rental?: RentalTerms
  sale?: SaleTerms
  maxGuests?: number
  whatsapp?: string
  taxPercent: number
  initial: {in?: string; out?: string; guests?: number}
}

const subscribeNever = () => () => {}
function nextDaysClient(): string {
  const out: string[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (out.length < 7) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out.join(',')
}

const TIMES = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00']

/** One panel per section, always a single page: pick what you need, add contact details, send. */
export function ActionPanel(props: Props) {
  const {type, locale} = props
  const t = getDictionary(locale)
  const money = useMoney()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'demo' | 'error'>('idle')
  const [errors, setErrors] = useState<string[]>([])
  const [contact, setContact] = useState({name: '', email: '', phone: '', message: '', website: ''})

  // booking
  const [checkIn, setCheckIn] = useState(props.initial.in ?? '')
  const [checkOut, setCheckOut] = useState(props.initial.out ?? '')
  const [guests, setGuests] = useState(props.initial.guests ?? 2)
  // tour / viewing
  // The next 7 days exist only on the client (empty during server render), so the page stays cacheable and hydration-safe.
  const daysKey = useSyncExternalStore(subscribeNever, nextDaysClient, () => '')
  const days = useMemo(() => (daysKey ? daysKey.split(',') : []), [daysKey])
  const [picked, setPicked] = useState('')
  const date = picked || days[0] || ''
  const setDate = setPicked
  const [time, setTime] = useState('')
  const [mode, setMode] = useState<'in-person' | 'video'>('in-person')
  // application
  const [lease, setLease] = useState(props.rental?.minLeaseMonths ?? 6)
  const [moveIn, setMoveIn] = useState(props.rental?.availableFrom ?? '')

  const nights = nightsBetween(checkIn, checkOut)
  const v = props.vacation
  const est = useMemo(
    () => (v?.nightlyRate && nights ? estimateStay({nightly: v.nightlyRate, nights, cleaning: v.cleaningFee, taxPercent: props.taxPercent}) : null),
    [v, nights, props.taxPercent],
  )
  const minNightsOk = !v?.minNights || nights >= v.minNights

  const fmtDay = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'})

  async function submit(e: React.FormEvent, kind: 'booking' | 'tour' | 'viewing' | 'application') {
    e.preventDefault()
    setState('sending')
    setErrors([])
    const base = {propertyId: props.propertyId, slug: props.slug, locale, name: contact.name, email: contact.email, phone: contact.phone, message: contact.message || undefined, website: contact.website}
    const body: unknown =
      kind === 'booking' ? {...base, kind, checkIn, checkOut, guests}
      : kind === 'application' ? {...base, kind, leaseMonths: lease, moveIn}
      : {...base, kind, date, time, mode}
    try {
      const res = await fetch('/api/requests', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body as RequestPayload)})
      const data = await res.json().catch(() => ({}))
      if (res.status === 422) { setErrors(data.fields ?? []); setState('error'); return }
      if (!res.ok) { setState('error'); return }
      setState(data.status === 'demo' ? 'demo' : 'done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done' || state === 'demo') {
    return (
      <div className="panel" id="reserve" role="status">
        <div className="ok">
          <h2>{t.sent}</h2>
          <p className="muted" style={{margin: 0}}>{t.sentBody}</p>
          {state === 'demo' && <p className="note">{t.demoNote}</p>}
        </div>
      </div>
    )
  }

  const bad = (f: string) => errors.includes(f)
  const contactFields = (
    <>
      <label className="field">{t.name}<input name="name" autoComplete="name" required value={contact.name} onChange={(e) => setContact({...contact, name: e.target.value})} aria-invalid={bad('name')} /></label>
      <div className="two">
        <label className="field">{t.email}<input name="email" type="email" autoComplete="email" required value={contact.email} onChange={(e) => setContact({...contact, email: e.target.value})} aria-invalid={bad('email')} /></label>
        <label className="field">{t.phone}<input name="phone" type="tel" autoComplete="tel" required value={contact.phone} onChange={(e) => setContact({...contact, phone: e.target.value})} aria-invalid={bad('phone')} /></label>
      </div>
      {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position: 'absolute', left: '-9999px'}} value={contact.website} onChange={(e) => setContact({...contact, website: e.target.value})} />
    </>
  )
  const errorLine = <p className="err" role="alert">{state === 'error' ? t.error : ''}</p>
  const fine = (
    <>
      <p className="note">{t.consentA} <Link href={`/${locale}/info/privacy`}>{t.consentLink}</Link>. {t.demoUpfront}</p>
      {props.whatsapp ? <a className="btn ghost" href={`https://wa.me/${props.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(t.whatsappText(props.title))}`} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a> : null}
    </>
  )

  if (type === 'vacation' && v) {
    return (
      <form className="panel" id="reserve" onSubmit={(e) => submit(e, 'booking')} noValidate>
        <div className="price"><span className="muted">{t.from}</span> <b className="num">{money(v.nightlyRate ?? 0, v.currency)}</b> <span className="muted">{t.perNight}</span></div>
        <div className="two">
          <label className="field">{t.checkIn}<input type="date" value={checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckIn(e.target.value)} required aria-invalid={bad('checkIn')} /></label>
          <label className="field">{t.checkOut}<input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} required aria-invalid={bad('checkOut')} /></label>
        </div>
        <label className="field">{t.guestsLabel}
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({length: props.maxGuests ?? 8}, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t.guests(n)}</option>)}
          </select>
        </label>
        {est && v ? (
          <dl className="lines" aria-live="polite">
            <div><dt>{money(v.nightlyRate ?? 0, v.currency)} × {t.nights(nights)}</dt><dd className="num">{money(est.accommodation, v.currency)}</dd></div>
            {est.cleaning > 0 && <div><dt>{t.cleaning}</dt><dd className="num">{money(est.cleaning, v.currency)}</dd></div>}
            <div><dt>{t.serviceFee}</dt><dd className="num">{t.free}</dd></div>
            <div><dt>{t.taxes}</dt><dd className="num">{money(est.taxes, v.currency)}</dd></div>
            <div className="total"><dt>{t.estTotal}</dt><dd className="num">{money(est.total, v.currency)}</dd></div>
          </dl>
        ) : null}
        {v.minNights && nights > 0 && !minNightsOk ? <p className="err" role="alert">{locale === 'es' ? `Estancia mínima: ${v.minNights} noches.` : `Minimum stay: ${v.minNights} nights.`}</p> : null}
        {contactFields}
        {errorLine}
        <button className="btn" data-type="vacation" disabled={state === 'sending' || !nights || !minNightsOk}>{t.reserve}{est && v ? ` · ${money(est.total, v.currency)}` : ''}</button>
        <p className="note">{t.estNote}</p>
        {fine}
      </form>
    )
  }

  // rental + sale share the tour/viewing picker
  const r = props.rental
  const s = props.sale
  const kind = type === 'rental' ? 'tour' : 'viewing'
  const modes = props.viewingModes
  return (
    <form className="panel" id="reserve" onSubmit={(e) => submit(e, kind)} noValidate>
      {r && (
        <>
          <div className="price"><b className="num">{money(r.monthlyRent ?? 0, r.currency)}</b> <span className="muted">{t.perMonth}</span></div>
          <dl className="lines">
            {r.depositMonths !== undefined && <div><dt>{t.deposit}</dt><dd className="num">{t.months(r.depositMonths)}</dd></div>}
            {r.minLeaseMonths && r.maxLeaseMonths && <div><dt>{t.leaseMonths}</dt><dd>{r.minLeaseMonths}–{r.maxLeaseMonths}</dd></div>}
            {r.utilitiesIncluded?.length ? <div><dt>{t.included}</dt><dd>{r.utilitiesIncluded.join(', ')}</dd></div> : null}
          </dl>
        </>
      )}
      {s && (
        <>
          <div className="price"><b className="num">{money(s.askingPrice ?? 0, s.currency)}</b></div>
          <dl className="lines">
            {s.monthlyMaintenanceFee ? <div><dt>{t.maintenance}</dt><dd className="num">{money(s.monthlyMaintenanceFee, s.currency)}</dd></div> : null}
            {s.ownership && s.ownership !== 'other' ? <div><dt>{locale === 'es' ? 'Titularidad' : 'Title'}</dt><dd>{t[s.ownership]}</dd></div> : null}
          </dl>
        </>
      )}
      <h2>{t.pickTime}</h2>
      <fieldset style={{border: 0, padding: 0, margin: 0}}>
        <legend className="sr-only">{t.day}</legend>
        <div className="slots">
          {days.map((d) => <button type="button" key={d} className="slot" aria-pressed={date === d} onClick={() => setDate(d)}>{fmtDay(d)}</button>)}
        </div>
      </fieldset>
      <fieldset style={{border: 0, padding: 0, margin: 0}}>
        <legend className="sr-only">{t.time}</legend>
        <div className="slots">
          {TIMES.map((x) => <button type="button" key={x} className="slot num" aria-pressed={time === x} onClick={() => setTime(x)}>{x}</button>)}
        </div>
      </fieldset>
      {modes.length > 1 && (
        <div className="seg" role="group" aria-label={t.mode}>
          {modes.map((m) => <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m as 'in-person' | 'video')}>{m === 'video' ? t.video : t.inPerson}</button>)}
        </div>
      )}
      {contactFields}
      {errorLine}
      <button className="btn" data-type={type} disabled={state === 'sending' || !date || !time}>{t.cta[type]}</button>
      {r && (
        <details>
          <summary className="note" style={{cursor: 'pointer'}}>{t.applyNow}</summary>
          <div className="form" style={{marginTop: 10}}>
            <div className="two">
              <label className="field">{t.leaseMonths}
                <select value={lease} onChange={(e) => setLease(Number(e.target.value))}>
                  {Array.from({length: (r.maxLeaseMonths ?? 11) - (r.minLeaseMonths ?? 1) + 1}, (_, i) => (r.minLeaseMonths ?? 1) + i).map((n) => <option key={n} value={n}>{t.months(n)}</option>)}
                </select>
              </label>
              <label className="field">{t.moveIn}<input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} /></label>
            </div>
            <button type="button" className="btn ghost" disabled={state === 'sending' || !moveIn} onClick={(e) => submit(e, 'application')}>{t.applyNow}</button>
          </div>
        </details>
      )}
      {fine}
    </form>
  )
}
