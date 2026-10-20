import type {ListingType, Locale} from '@/i18n/config'
import {formatMoney} from '@/i18n/dictionary'
import type {PropertyDetail} from '@/sanity/types'

export type Faq = {q: string; a: string}
const L = (locale: Locale, es: string, en: string) => (locale === 'es' ? es : en)

const CANCELLATION: Record<string, {es: string; en: string}> = {
  flexible: {es: 'reembolso total hasta 7 días antes de la llegada', en: 'full refund until 7 days before check-in'},
  moderate: {es: 'reembolso total hasta 14 días antes de la llegada', en: 'full refund until 14 days before check-in'},
  strict: {es: 'reembolso del 50% hasta 30 días antes de la llegada', en: '50% refund until 30 days before check-in'},
}

/** General questions people (and AI assistants) ask about booking direct. Facts only. */
export function homeFaqs(locale: Locale): Faq[] {
  return [
    {
      q: L(locale, '¿Cobran cuota de servicio?', 'Is there a service fee?'),
      a: L(locale, 'No. No agregamos cuota de servicio. El total mostrado incluye la limpieza y una estimación de impuestos; el precio final se confirma al reservar.', 'No. We do not add a service fee. The total shown includes cleaning and an estimate of taxes; the final price is confirmed when you reserve.'),
    },
    {
      q: L(locale, '¿Qué tipos de propiedades ofrecen?', 'What kinds of properties do you offer?'),
      a: L(locale, 'Estancias vacacionales de unos días a unas semanas, rentas de 1 a 11 meses y propiedades en venta, en Playa del Carmen y Playacar, Quintana Roo, México.', 'Vacation stays from a few days to a few weeks, rentals of 1 to 11 months, and properties for sale, in Playa del Carmen and Playacar, Quintana Roo, Mexico.'),
    },
    {
      q: L(locale, '¿Cómo reservo o agendo una visita?', 'How do I book or schedule a visit?'),
      a: L(locale, 'Elige una propiedad, selecciona fechas (estancias) o un horario (rentas y ventas) y envía tus datos. Las visitas pueden ser en persona o por videollamada.', 'Pick a property, choose dates (stays) or a time slot (rentals and sales) and send your details. Tours and viewings can be in person or by video call.'),
    },
    {
      q: L(locale, '¿En qué idiomas atienden?', 'Which languages do you support?'),
      a: L(locale, 'Español e inglés.', 'Spanish and English.'),
    },
  ]
}

export function sectionFaqs(type: ListingType, locale: Locale): Faq[] {
  if (type === 'vacation')
    return [
      {q: L(locale, '¿Qué incluye el precio?', 'What is included in the price?'), a: L(locale, 'El total muestra hospedaje, limpieza y una estimación de impuestos. No hay cuota de servicio.', 'The total shows accommodation, cleaning and an estimate of taxes. There is no service fee.')},
      {q: L(locale, '¿Cómo funciona la cancelación?', 'How does cancellation work?'), a: L(locale, 'Cada estancia indica su política de cancelación antes de reservar.', 'Each stay states its cancellation policy before you reserve.')},
      {q: L(locale, '¿Puedo reservar por varias semanas?', 'Can I book for several weeks?'), a: L(locale, 'Sí. Cada ficha indica la estancia mínima y máxima.', 'Yes. Each listing shows its minimum and maximum stay.')},
    ]
  if (type === 'rental')
    return [
      {q: L(locale, '¿De cuánto tiempo son los contratos?', 'How long are the leases?'), a: L(locale, 'De 1 a 11 meses. Cada ficha indica el rango disponible.', 'From 1 to 11 months. Each listing shows its available range.')},
      {q: L(locale, '¿Puedo conocer la propiedad antes de rentar?', 'Can I see the property before renting?'), a: L(locale, 'Sí. Agenda una visita en persona o por videollamada, o inicia una solicitud desde la ficha.', 'Yes. Book a tour in person or by video call, or start an application from the listing.')},
      {q: L(locale, '¿Cuánto es el depósito?', 'How much is the deposit?'), a: L(locale, 'Cada ficha indica el depósito en meses de renta.', 'Each listing states the deposit in months of rent.')},
    ]
  return [
    {q: L(locale, '¿Puedo ver una propiedad a distancia?', 'Can I view a property remotely?'), a: L(locale, 'Sí. Las visitas pueden agendarse por videollamada o en persona.', 'Yes. Viewings can be booked by video call or in person.')},
    {q: L(locale, '¿Qué es un fideicomiso?', 'What is a fideicomiso?'), a: L(locale, 'Es un fideicomiso bancario, una forma de titularidad común cuando compradores extranjeros adquieren en la zona costera restringida de México. Cada ficha indica su tipo de titularidad; consulta a un notario o abogado.', 'A bank trust, a title structure commonly used when foreign buyers purchase in Mexico’s restricted coastal zone. Each listing states its title type; ask a notary or lawyer for advice.')},
    {q: L(locale, '¿Qué opciones de pago hay?', 'What financing options are there?'), a: L(locale, 'Cada ficha lista las opciones de financiamiento disponibles para esa propiedad.', 'Each listing lists the financing options available for that property.')},
  ]
}

/** Per-property questions answered only from that property's own data. */
export function propertyFaqs(p: PropertyDetail, locale: Locale, title: string): Faq[] {
  const out: Faq[] = []
  const money = (n: number, c: 'MXN' | 'USD') => formatMoney(n, c, locale)

  if (p.listingType === 'vacation' && p.vacation) {
    const v = p.vacation
    if (p.maxGuests)
      out.push({q: L(locale, `¿Cuántas personas caben en ${title}?`, `How many guests can ${title} sleep?`), a: L(locale, `Hasta ${p.maxGuests} huéspedes${p.bedrooms !== undefined ? `, ${p.bedrooms === 0 ? 'estudio' : `${p.bedrooms} recámara${p.bedrooms === 1 ? '' : 's'}`}` : ''}${p.bathrooms ? ` y ${p.bathrooms} baño${p.bathrooms === 1 ? '' : 's'}` : ''}.`, `Up to ${p.maxGuests} guests${p.bedrooms !== undefined ? `, ${p.bedrooms === 0 ? 'studio' : `${p.bedrooms} bedroom${p.bedrooms === 1 ? '' : 's'}`}` : ''}${p.bathrooms ? ` and ${p.bathrooms} bathroom${p.bathrooms === 1 ? '' : 's'}` : ''}.`)})
    if (v.nightlyRate)
      out.push({q: L(locale, `¿Cuánto cuesta ${title} por noche?`, `How much is ${title} per night?`), a: L(locale, `Desde ${money(v.nightlyRate, v.currency)} por noche, sin cuota de servicio.${v.minNights ? ` Estancia mínima: ${v.minNights} noches.` : ''}`, `From ${money(v.nightlyRate, v.currency)} per night, with no service fee.${v.minNights ? ` Minimum stay: ${v.minNights} nights.` : ''}`)})
    if (v.checkInTime && v.checkOutTime)
      out.push({q: L(locale, '¿A qué hora es el check-in y el check-out?', 'What are the check-in and check-out times?'), a: L(locale, `Check-in a las ${v.checkInTime} y check-out a las ${v.checkOutTime}.`, `Check-in is at ${v.checkInTime} and check-out is at ${v.checkOutTime}.`)})
    if (v.cancellationPolicy && CANCELLATION[v.cancellationPolicy])
      out.push({q: L(locale, '¿Cuál es la política de cancelación?', 'What is the cancellation policy?'), a: L(locale, `Política ${v.cancellationPolicy === 'flexible' ? 'flexible' : v.cancellationPolicy === 'moderate' ? 'moderada' : 'estricta'}: ${CANCELLATION[v.cancellationPolicy].es}.`, `${v.cancellationPolicy[0].toUpperCase()}${v.cancellationPolicy.slice(1)} policy: ${CANCELLATION[v.cancellationPolicy].en}.`)})
  }

  if (p.listingType === 'rental' && p.rental) {
    const r = p.rental
    if (r.monthlyRent)
      out.push({q: L(locale, `¿Cuánto es la renta de ${title}?`, `How much is the rent for ${title}?`), a: L(locale, `${money(r.monthlyRent, r.currency)} al mes${r.depositMonths !== undefined ? ` con depósito de ${r.depositMonths} ${r.depositMonths === 1 ? 'mes' : 'meses'}` : ''}.`, `${money(r.monthlyRent, r.currency)} per month${r.depositMonths !== undefined ? ` with a deposit of ${r.depositMonths} ${r.depositMonths === 1 ? 'month' : 'months'}` : ''}.`)})
    if (r.minLeaseMonths && r.maxLeaseMonths)
      out.push({q: L(locale, '¿De cuánto tiempo es el contrato?', 'How long is the lease?'), a: L(locale, `De ${r.minLeaseMonths} a ${r.maxLeaseMonths} meses${r.availableFrom ? `, disponible desde el ${r.availableFrom}` : ''}.`, `From ${r.minLeaseMonths} to ${r.maxLeaseMonths} months${r.availableFrom ? `, available from ${r.availableFrom}` : ''}.`)})
    if (r.utilitiesIncluded?.length)
      out.push({q: L(locale, '¿Qué servicios están incluidos?', 'What utilities are included?'), a: r.utilitiesIncluded.join(', ') + '.'})
    if (r.petsPolicy && r.petsPolicy !== 'ask')
      out.push({q: L(locale, '¿Se aceptan mascotas?', 'Are pets allowed?'), a: r.petsPolicy === 'allowed' ? L(locale, 'Sí, se aceptan mascotas.', 'Yes, pets are allowed.') : L(locale, 'No, no se aceptan mascotas.', 'No, pets are not allowed.')})
  }

  if (p.listingType === 'sale' && p.sale) {
    const s = p.sale
    if (s.askingPrice) {
      const area = p.propertyType === 'land' ? p.landAreaM2 : p.builtAreaM2
      out.push({q: L(locale, `¿Cuál es el precio de ${title}?`, `What is the asking price for ${title}?`), a: L(locale, `${money(s.askingPrice, s.currency)}${area ? ` (${money(Math.round(s.askingPrice / area), s.currency)} por m²)` : ''}.`, `${money(s.askingPrice, s.currency)}${area ? ` (${money(Math.round(s.askingPrice / area), s.currency)} per m²)` : ''}.`)})
    }
    if (s.ownership && s.ownership !== 'other')
      out.push({q: L(locale, '¿Qué tipo de titularidad tiene?', 'What type of title does it have?'), a: s.ownership === 'fideicomiso' ? L(locale, 'Fideicomiso (fideicomiso bancario).', 'Fideicomiso (bank trust).') : L(locale, 'Escritura (dominio pleno).', 'Escritura (fee simple).')})
    if (s.financing?.length)
      out.push({q: L(locale, '¿Qué opciones de pago acepta?', 'What payment options are available?'), a: s.financing.join(', ') + '.'})
  }

  if (p.listingType !== 'vacation')
    out.push({q: L(locale, '¿Puedo agendar una visita?', 'Can I book a visit?'), a: L(locale, 'Sí, en persona o por videollamada, eligiendo día y horario en esta página.', 'Yes, in person or by video call, by choosing a day and time on this page.')})
  return out
}
