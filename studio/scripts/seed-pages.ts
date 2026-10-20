/**
 * Demo legal pages (privacy, terms, cancellation). They state plainly that this is a demonstration site and describe
 * what the site actually does today. Replace the text with counsel-approved wording before taking real bookings.
 * Run: npx sanity exec scripts/seed-pages.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-02-01'})
const key = () => Math.random().toString(36).slice(2, 12)
const block = (text: string, style: 'normal' | 'h2' = 'normal') => ({_type: 'block', _key: key(), style, markDefs: [], children: [{_type: 'span', _key: key(), text, marks: []}]})
const ls = (es: string, en: string) => ({_type: 'localeString', es, en})
const lb = (es: [string, 'normal' | 'h2'][], en: [string, 'normal' | 'h2'][]) => ({_type: 'localeBlock', es: es.map(([t, s]) => block(t, s)), en: en.map(([t, s]) => block(t, s))})

const PAGES = [
  {
    id: 'page-privacy', slug: 'privacy', title: ls('Aviso de privacidad', 'Privacy notice'),
    body: lb([
      ['Este es un sitio de demostración. Este texto describe lo que el sitio hace hoy y es un marcador de posición: no es un aviso de privacidad legal y debe sustituirse antes de operar con clientes reales.', 'normal'],
      ['Qué datos recibe el sitio', 'h2'],
      ['Cuando envías una solicitud (reserva, visita o solicitud de renta) el formulario valida tu nombre, correo, teléfono, mensaje y fechas elegidas. En esta demostración la solicitud no se guarda, no se envía por correo y no se registra en ningún servidor.', 'normal'],
      ['Qué se guarda en tu navegador', 'h2'],
      ['Tus preferencias de idioma, moneda y tema se guardan en tu navegador (almacenamiento local y una cookie de idioma) solo para recordar tu elección. No usamos cookies de publicidad ni de seguimiento, ni herramientas de analítica.', 'normal'],
      ['Terceros', 'h2'],
      ['Las fotos se sirven desde la red de contenido de Sanity y el sitio está alojado en Vercel, que procesa direcciones IP en sus registros de servidor.', 'normal'],
      ['Tus derechos', 'h2'],
      ['En un sitio en producción, el responsable deberá indicar cómo ejercer los derechos de acceso, rectificación, cancelación y oposición (ARCO) conforme a la ley mexicana aplicable.', 'normal'],
    ], [
      ['This is a demonstration site. This text describes what the site does today and is a placeholder: it is not a legal privacy notice and must be replaced before operating with real customers.', 'normal'],
      ['What data the site receives', 'h2'],
      ['When you send a request (a booking, a tour or viewing, or a rental application) the form validates your name, email, phone, message and chosen dates. In this demo the request is not stored, not emailed and not logged on any server.', 'normal'],
      ['What is saved in your browser', 'h2'],
      ['Your language, currency and theme choices are saved in your browser (local storage and a language cookie) only to remember them. We use no advertising or tracking cookies and no analytics tools.', 'normal'],
      ['Third parties', 'h2'],
      ['Photos are served from Sanity’s content network and the site is hosted on Vercel, which processes IP addresses in its server logs.', 'normal'],
      ['Your rights', 'h2'],
      ['On a production site the operator must explain how to exercise rights of access, rectification, cancellation and objection (ARCO) under applicable Mexican law.', 'normal'],
    ]),
  },
  {
    id: 'page-terms', slug: 'terms', title: ls('Términos del sitio', 'Terms of use'),
    body: lb([
      ['Este es un sitio de demostración. Estos términos son un marcador de posición y no constituyen un contrato.', 'normal'],
      ['Qué es este sitio', 'h2'],
      ['Muestra cómo funcionaría una plataforma de reservas directas, rentas de 1 a 11 meses y venta de propiedades en Playa del Carmen. No se realizan reservas, no se cobra ningún pago y no se agenda ninguna visita.', 'normal'],
      ['Información de las propiedades', 'h2'],
      ['Las fichas marcadas como «Ejemplo» son datos ilustrativos; sus fotos y recorridos 360° son imágenes generadas. Los precios, impuestos y tipos de cambio son indicativos. Los totales mostrados son estimaciones hasta que el precio final se confirme al reservar.', 'normal'],
      ['Cuota de servicio', 'h2'],
      ['El sitio no agrega cuota de servicio a las estancias. El procesador de pagos puede cobrar sus propias comisiones al operador, no al huésped.', 'normal'],
    ], [
      ['This is a demonstration site. These terms are a placeholder and are not a contract.', 'normal'],
      ['What this site is', 'h2'],
      ['It shows how a platform for direct bookings, 1 to 11 month rentals and property sales in Playa del Carmen would work. No bookings are made, no payment is taken and no visit is scheduled.', 'normal'],
      ['Property information', 'h2'],
      ['Listings marked “Example” are illustrative data; their photos and 360° tours are generated images. Prices, taxes and exchange rates are indicative. Totals shown are estimates until the final price is confirmed at booking.', 'normal'],
      ['Service fee', 'h2'],
      ['The site adds no service fee to stays. The payment processor may charge its own fees to the operator, not to the guest.', 'normal'],
    ]),
  },
  {
    id: 'page-cancellation', slug: 'cancellation', title: ls('Política de cancelación', 'Cancellation policy'),
    body: lb([
      ['Estas políticas describen cómo se modelan en el sitio; son un marcador de posición de demostración.', 'normal'],
      ['Flexible', 'h2'],
      ['Reembolso total hasta 7 días antes de la llegada.', 'normal'],
      ['Moderada', 'h2'],
      ['Reembolso total hasta 14 días antes de la llegada.', 'normal'],
      ['Estricta', 'h2'],
      ['Reembolso del 50% hasta 30 días antes de la llegada.', 'normal'],
      ['Cada estancia indica su política en la ficha. Las rentas y las ventas no usan estas políticas.', 'normal'],
    ], [
      ['These policies describe how they are modeled on the site; they are a demonstration placeholder.', 'normal'],
      ['Flexible', 'h2'],
      ['Full refund until 7 days before check-in.', 'normal'],
      ['Moderate', 'h2'],
      ['Full refund until 14 days before check-in.', 'normal'],
      ['Strict', 'h2'],
      ['50% refund until 30 days before check-in.', 'normal'],
      ['Each stay shows its policy on its page. Rentals and sales do not use these policies.', 'normal'],
    ]),
  },
]

async function main() {
  const tx = client.transaction()
  for (const p of PAGES) tx.createOrReplace({_id: p.id, _type: 'page', title: p.title, slug: {_type: 'slug', current: p.slug}, body: p.body})
  const res = await tx.commit()
  console.log(`pages seeded: ${res.results.length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
