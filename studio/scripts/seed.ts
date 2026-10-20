/**
 * Seeds the production dataset with:
 *  - taxonomy: areas, amenities, personas, a contact, section pages, site settings
 *  - the 6 vacation rentals from the legacy site (real data and photos, up to 20 each)
 *  - sample long-term-lease and for-sale listings (marked isSample, no photos)
 *
 * Run from /studio:  npx sanity exec scripts/seed.ts --with-user-token
 * Idempotent: documents use fixed IDs and are replaced, assets are de-duplicated by Sanity.
 */
import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-02-01'})
const LEGACY_ORIGIN = 'https://atodamadre.properties'
const legacy = JSON.parse(readFileSync(new URL('./seed/legacy.json', import.meta.url), 'utf8')) as Record<
  string,
  {
    title: string
    images: string[]
    desc: string[]
    fee: number
    occ: number
    amenities: Record<string, string | boolean>
    extras: string[]
    beds: [string, string][]
    lng_lat: [string, string]
  }
>

const key = () => Math.random().toString(36).slice(2, 12)
const ref = (id: string) => ({_type: 'reference', _ref: id})
const ls = (es: string, en?: string) => ({_type: 'localeString', es, ...(en ? {en} : {})})
const lt = (es: string, en?: string) => ({_type: 'localeText', es, ...(en ? {en} : {})})
const para = (text: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key(), text, marks: []}],
})
const lb = (es: string[], en?: string[]) => ({
  _type: 'localeBlock',
  es: es.map(para),
  ...(en ? {en: en.map(para)} : {}),
})

/* ---------------------------------------------------------------- taxonomy */

const areas = [
  {id: 'area-playacar', es: 'Playacar Fase 2', en: 'Playacar Phase 2', slug: 'playacar', lat: 20.6127, lng: -87.0999,
   des: ['Fraccionamiento con jardines, selva, campo de golf, resorts, playas y ruinas arqueológicas.', 'Gated community with gardens, jungle, a golf course, resorts, beaches and archaeological ruins.']},
  {id: 'area-playa', es: 'Playa del Carmen', en: 'Playa del Carmen', slug: 'playa-del-carmen', lat: 20.6334, lng: -87.0766,
   des: ['Zona tranquila a pasos de la playa y de la Quinta Avenida.', 'A calm area close to the beach and Fifth Avenue.']},
]

const amenities: {id: string; code: string; es: string; en: string; cat: string; hi?: boolean}[] = [
  {id: 'am-pool', code: 'pool', es: 'Alberca', en: 'Pool', cat: 'wellness', hi: true},
  {id: 'am-wifi', code: 'wifi', es: 'Wifi', en: 'Wifi', cat: 'essentials', hi: true},
  {id: 'am-ac', code: 'ac', es: 'Aire acondicionado', en: 'Air conditioning', cat: 'essentials', hi: true},
  {id: 'am-kitchen', code: 'kitchen', es: 'Cocina equipada', en: 'Equipped kitchen', cat: 'kitchen'},
  {id: 'am-dishwasher', code: 'dishwasher', es: 'Lavavajillas', en: 'Dishwasher', cat: 'kitchen'},
  {id: 'am-washer', code: 'washer', es: 'Lavadora', en: 'Washing machine', cat: 'essentials'},
  {id: 'am-dryer', code: 'dryer', es: 'Secadora', en: 'Dryer', cat: 'essentials'},
  {id: 'am-tv', code: 'tv', es: 'TV', en: 'TV', cat: 'essentials'},
  {id: 'am-parking', code: 'parking', es: 'Estacionamiento', en: 'Parking', cat: 'access'},
  {id: 'am-gym', code: 'gym', es: 'Gimnasio', en: 'Gym', cat: 'wellness', hi: true},
  {id: 'am-elevator', code: 'elevator', es: 'Elevador', en: 'Elevator', cat: 'access'},
  {id: 'am-garden', code: 'garden', es: 'Jardín', en: 'Garden', cat: 'outdoor'},
  {id: 'am-terrace', code: 'terrace', es: 'Terraza', en: 'Terrace', cat: 'outdoor'},
  {id: 'am-balcony', code: 'balcony', es: 'Balcón', en: 'Balcony', cat: 'outdoor'},
  {id: 'am-accessible', code: 'accessible', es: 'Acceso para personas con discapacidad', en: 'Accessible entrance', cat: 'access'},
  {id: 'am-safe', code: 'safe', es: 'Caja fuerte', en: 'Safe', cat: 'safety'},
  {id: 'am-security', code: 'security', es: 'Seguridad', en: 'Security', cat: 'safety'},
  {id: 'am-beachclub', code: 'beach-club-card', es: 'Tarjeta Reef Beach Club', en: 'Reef Beach Club card', cat: 'outdoor'},
  {id: 'am-beachgear', code: 'beach-gear', es: 'Sillas de playa y sombrilla', en: 'Beach chairs and umbrella', cat: 'outdoor'},
  {id: 'am-rooftop', code: 'rooftop', es: 'Roof con camastros y pérgola', en: 'Rooftop with loungers and pergola', cat: 'outdoor'},
  {id: 'am-workspace', code: 'workspace', es: 'Espacio de trabajo', en: 'Dedicated workspace', cat: 'work', hi: true},
  {id: 'am-jacuzzi', code: 'jacuzzi', es: 'Jacuzzi', en: 'Jacuzzi', cat: 'wellness'},
]

type Preset = Record<string, unknown>
const personas: {id: string; slug: string; es: string; en: string; tagES: string; tagEN: string; types: string[]; preset: Preset; order: number}[] = [
  {id: 'persona-families', slug: 'families', es: 'Familias', en: 'Families', tagES: '2 o más recámaras, cerca de la playa', tagEN: '2+ bedrooms, close to the beach', types: ['vacation', 'rental', 'sale'], preset: {audience: 'families', minBedrooms: 2}, order: 10},
  {id: 'persona-couples', slug: 'couples', es: 'Parejas', en: 'Couples', tagES: 'Escapadas tranquilas', tagEN: 'Quiet getaways', types: ['vacation'], preset: {audience: 'couples'}, order: 20},
  {id: 'persona-groups', slug: 'groups', es: 'Grupos de amigos', en: 'Groups of friends', tagES: 'Espacio para 6 o más', tagEN: 'Room for 6+', types: ['vacation'], preset: {audience: 'groups', minGuests: 6}, order: 30},
  {id: 'persona-beach', slug: 'beach-first', es: 'Playa primero', en: 'Beach first', tagES: 'A menos de 500 m del mar', tagEN: 'Under 500 m from the sea', types: ['vacation', 'sale'], preset: {maxBeachKm: 0.5}, order: 40},
  {id: 'persona-remote', slug: 'remote-workers', es: 'Trabajo remoto', en: 'Remote workers', tagES: 'Wifi rápido y espacio de trabajo', tagEN: 'Fast wifi and a desk', types: ['vacation', 'rental'], preset: {remoteWorkReady: true}, order: 50},
  {id: 'persona-professionals', slug: 'professionals', es: 'Profesionistas en mudanza', en: 'Relocating professionals', tagES: 'Amueblado, contrato corto', tagEN: 'Furnished, short lease', types: ['rental'], preset: {audience: 'professionals'}, order: 60},
  {id: 'persona-pets', slug: 'pet-owners', es: 'Con mascotas', en: 'With pets', tagES: 'Aceptan mascotas', tagEN: 'Pets welcome', types: ['vacation', 'rental'], preset: {petFriendly: true}, order: 70},
  {id: 'persona-investors', slug: 'investors', es: 'Inversionistas', en: 'Investors', tagES: 'Rentabilidad estimada y ocupación', tagEN: 'Estimated yield and occupancy', types: ['sale'], preset: {audience: 'investors'}, order: 80},
  {id: 'persona-second-home', slug: 'second-home', es: 'Segunda casa y retiro', en: 'Second home and retirement', tagES: 'Cerca de servicios y del mar', tagEN: 'Near services and the sea', types: ['sale'], preset: {audience: 'second-home'}, order: 90},
  {id: 'persona-first-home', slug: 'first-home', es: 'Primera vivienda', en: 'First home', tagES: 'Para vivir todo el año', tagEN: 'To live in year-round', types: ['sale'], preset: {audience: 'first-home'}, order: 100},
]

const sections = [
  {id: 'section-vacation', type: 'vacation', nav: ['Estancias', 'Stays'], title: ['Estancias vacacionales', 'Vacation stays'], tag: ['De unas noches a unas semanas. Reserva directo, sin cuota de servicio.', 'From a few nights to a few weeks. Book direct with no service fee.'], cta: ['Reservar', 'Book your stay'], personas: ['persona-families', 'persona-couples', 'persona-groups', 'persona-beach', 'persona-remote', 'persona-pets']},
  {id: 'section-rental', type: 'rental', nav: ['Rentas', 'Rentals'], title: ['Rentas de 1 a 11 meses', 'Rentals for 1 to 11 months'], tag: ['Amueblado, contrato corto y visita en un paso.', 'Furnished, short lease, tour in one step.'], cta: ['Agendar visita', 'Book a tour'], personas: ['persona-professionals', 'persona-remote', 'persona-families', 'persona-pets']},
  {id: 'section-sale', type: 'sale', nav: ['En venta', 'For sale'], title: ['Propiedades en venta', 'Properties for sale'], tag: ['Agenda una visita en persona o por videollamada.', 'Book an in-person or video viewing.'], cta: ['Agendar visita', 'Book a viewing'], personas: ['persona-investors', 'persona-second-home', 'persona-first-home', 'persona-families', 'persona-beach']},
]

/* ------------------------------------------------------- vacation (legacy) */

const AM_MAP: [string, string][] = [
  ['Equipped Kitchen', 'am-kitchen'], ['Washing Machine', 'am-washer'], ['Dryer', 'am-dryer'], ['Internet/Wifi', 'am-wifi'],
  ['Air Conditioner', 'am-ac'], ['GYM', 'am-gym'], ['Elevator', 'am-elevator'], ['Garden', 'am-garden'],
  ['Disabled access', 'am-accessible'], ['Jacuzzi', 'am-jacuzzi'],
]
const EXTRA_MAP: Record<string, string> = {
  Safe: 'am-safe', Security: 'am-security', Dishwasher: 'am-dishwasher', 'Reef Beach club Card': 'am-beachclub', 'Reef Beach club': 'am-beachclub',
}
const copy: Record<string, {sumES: string; sumEN: string; desc?: {es: string[]; en: string[]}; area: string; aud: string[]; featured?: boolean}> = {
  'vaiven-del-mar-fe': {sumES: 'Condominio tranquilo en Playacar Fase 2, con jardines tropicales y alberca compartida. 3 recámaras para hasta 8 personas.', sumEN: 'Quiet condo in Playacar Phase 2 with tropical gardens and a shared pool. 3 bedrooms for up to 8 guests.', area: 'area-playacar', aud: ['families', 'groups'], featured: true},
  'vaiven-del-mar-lb': {sumES: 'Condominio tranquilo en Playacar Fase 2, con jardines tropicales y alberca compartida. 3 recámaras para hasta 8 personas.', sumEN: 'Quiet condo in Playacar Phase 2 with tropical gardens and a shared pool. 3 bedrooms for up to 8 guests.', area: 'area-playacar', aud: ['families', 'groups']},
  'solea-5': {sumES: 'Quinto nivel con brisa y sin edificios al frente. Roof con gimnasio, camastros y pérgola; sillas de playa incluidas.', sumEN: 'Fifth-floor unit with a steady breeze and no buildings in front. Rooftop gym, loungers and pergola; beach chairs included.', area: 'area-playa', aud: ['couples'], featured: true},
  'solea-4': {sumES: 'Cuarto nivel con vista al deportivo Mario Villanueva. Roof con gimnasio, camastros y pérgola; sillas de playa incluidas.', sumEN: 'Fourth-floor unit overlooking the Mario Villanueva sports complex. Rooftop gym, loungers and pergola; beach chairs included.', area: 'area-playa', aud: ['couples']},
  'solea-2': {sumES: 'Estudio en segundo nivel sobre la calle 34. Roof con gimnasio, camastros y pérgola; sillas de playa incluidas.', sumEN: 'Second-floor studio on 34th street. Rooftop gym, loungers and pergola; beach chairs included.', area: 'area-playa', aud: ['couples']},
  'casa-del-mar': {
    sumES: 'Edificio frente a la playa en una zona tranquila de Playa del Carmen. 2 recámaras para hasta 6 personas.',
    sumEN: 'Beachfront-block building in a calm part of Playa del Carmen. 2 bedrooms for up to 6 guests.',
    desc: {
      es: ['Esta zona de Playa del Carmen no es del todo nueva pero, a diferencia de otras más concurridas, no está saturada de edificios, comercios ni gente: es tranquila, segura y agradable, sin quedar lejos de todo.', 'El edificio Casa del Mar está justo frente a la playa. Aunque el departamento no tiene vista al mar, solo tendrás que caminar unos pasos para disfrutarlo.'],
      en: ["This area of Playa del Carmen isn't entirely new, but unlike other, more crowded areas, it's not saturated with buildings, shops, or people, making it a peaceful, safe, and pleasant place, without being far from everything.", "The Casa del Mar building is right across from the beach. Although our apartment doesn't have an ocean view, you'll only have to walk a few steps to enjoy one."],
    },
    area: 'area-playa', aud: ['families', 'couples'],
  },
}
const BED_MAP: Record<string, string> = {King: 'king', Queen: 'queen', Double: 'double', Single: 'single'}

async function uploadPhoto(cache: Map<string, string>, path: string): Promise<string> {
  const hit = cache.get(path)
  if (hit) return hit
  const res = await fetch(LEGACY_ORIGIN + path)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  const dir = mkdtempSync(join(tmpdir(), 'seed-'))
  const src = join(dir, 'in.jpg')
  const out = join(dir, 'out.jpg')
  writeFileSync(src, Buffer.from(await res.arrayBuffer()))
  let file = src
  try {
    // Downscale the 4 to 6 MB originals; Sanity's CDN serves every other size from this.
    execFileSync('sips', ['-Z', '2400', '-s', 'formatOptions', '82', src, '--out', out], {stdio: 'ignore'})
    file = out
  } catch {
    /* sips is macOS only; fall back to the original */
  }
  const asset = await client.assets.upload('image', readFileSync(file), {filename: path.split('/').pop()})
  cache.set(path, asset._id)
  return asset._id
}

const ROOM_BY_INDEX = (i: number) => (i === 0 ? 'exterior' : undefined)

async function main() {
  const docs: Record<string, unknown>[] = []
  const photoCache = new Map<string, string>()

  for (const a of areas)
    docs.push({_id: a.id, _type: 'area', name: ls(a.es, a.en), slug: {_type: 'slug', current: a.slug}, description: lt(a.des[0], a.des[1]), location: {_type: 'geopoint', lat: a.lat, lng: a.lng}})

  for (const a of amenities)
    docs.push({_id: a.id, _type: 'amenity', label: ls(a.es, a.en), code: {_type: 'slug', current: a.code}, category: a.cat, highlight: !!a.hi})

  docs.push({_id: 'agent-team', _type: 'agent', name: 'Equipo A Toda Madre', role: ls('Atención a huéspedes', 'Guest team'), languages: ['es', 'en']})

  for (const p of personas)
    docs.push({_id: p.id, _type: 'persona', title: ls(p.es, p.en), slug: {_type: 'slug', current: p.slug}, tagline: ls(p.tagES, p.tagEN), appliesTo: p.types, preset: p.preset, order: p.order})

  for (const s of sections)
    docs.push({
      _id: s.id, _type: 'listingSection', sectionType: s.type, navLabel: ls(s.nav[0], s.nav[1]), title: ls(s.title[0], s.title[1]),
      tagline: ls(s.tag[0], s.tag[1]), primaryCta: ls(s.cta[0], s.cta[1]),
      personas: s.personas.map((id) => ({...ref(id), _key: key()})),
    })

  docs.push({
    _id: 'siteSettings', _type: 'siteSettings', siteName: 'A Toda Madre', tagline: ls('Playa del Carmen. Reserva directo.', 'Playa del Carmen. Book direct.'),
    defaultCurrency: 'USD', estimatedTaxPercent: 19,
    trustPoints: [ls('Sin cuota de servicio', 'No service fee'), ls('Precio total con impuestos', 'Total price with taxes'), ls('Cancelación flexible', 'Flexible cancellation')],
  })

  // legacy vacation rentals ------------------------------------------------
  for (const [slug, d] of Object.entries(legacy)) {
    const c = copy[slug]
    const a = d.amenities
    const n = (v: unknown) => (typeof v === 'string' ? parseFloat(v) : undefined)
    const entries: {_key: string; _type: string; amenity: unknown; detail?: unknown}[] = []
    const add = (id: string, detail?: [string, string]) => entries.push({_key: key(), _type: 'amenityEntry', amenity: ref(id), ...(detail ? {detail: ls(detail[0], detail[1])} : {})})
    for (const [label, id] of AM_MAP) if (a[label] === true) add(id)
    if (a['Pool']) add('am-pool', ['Compartida', 'Shared'])
    if (a['Balcony/Terrace'] === 'Terrace') add('am-terrace')
    if (a['Balcony/Terrace'] === 'Balcony') add('am-balcony')
    if (n(a['TV'])) add('am-tv', [`${n(a['TV'])} unidades`, `${n(a['TV'])} units`])
    if (n(a['Parking places'])) add('am-parking', [`${n(a['Parking places'])} lugar`, `${n(a['Parking places'])} space`])
    for (const x of d.extras) if (EXTRA_MAP[x]) add(EXTRA_MAP[x])
    if (slug.startsWith('solea')) { add('am-rooftop'); add('am-beachgear') }

    const gallery = []
    for (const [i, path] of d.images.slice(0, 20).entries()) {
      const id = await uploadPhoto(photoCache, path)
      gallery.push({_key: key(), _type: 'galleryImage', asset: ref(id), room: ROOM_BY_INDEX(i)})
      process.stdout.write('.')
    }
    process.stdout.write(` ${slug} (${gallery.length} photos)\n`)

    const [lng, lat] = d.lng_lat.map(Number)
    docs.push({
      _id: `property-${slug}`, _type: 'property', listingType: 'vacation', status: 'available', featured: !!c.featured,
      title: ls(d.title), slug: {_type: 'slug', current: slug},
      summary: lt(c.sumES, c.sumEN),
      description: lb(c.desc?.es ?? d.desc, c.desc?.en),
      audiences: c.aud, gallery,
      propertyType: slug === 'solea-2' ? 'studio' : 'apartment',
      bedrooms: n(a['Bedroom quantity']) ?? 1, bathrooms: n(a['Bathrooms']), maxGuests: d.occ,
      beds: d.beds.map(([t, count]) => ({_key: key(), _type: 'bedEntry', type: BED_MAP[t], count: Number(count)})),
      furnished: a['Furnished'] === true, parkingSpaces: n(a['Parking places']) ?? 0,
      stepFreeAccess: a['Disabled access'] === true,
      beachDistanceKm: n(a['Distance to the beach']),
      amenities: entries,
      vacation: {_type: 'vacationTerms', currency: 'USD', nightlyRate: d.fee, minNights: 2, maxNights: 28, checkInTime: '15:00', checkOutTime: '11:00', instantBook: true, cancellationPolicy: 'flexible'},
      viewing: {_type: 'viewingOptions', enabled: false},
      agent: ref('agent-team'), area: ref(c.area), location: {_type: 'geopoint', lat, lng}, showExactPin: false,
    })
  }

  // sample rentals and sales (no photos; clearly marked) ---------------------
  const sample = {isSample: true, status: 'available', agent: ref('agent-team'), viewing: {_type: 'viewingOptions', enabled: true, modes: ['in-person', 'video'], slotMinutes: 30, leadTimeHours: 12}}
  const am = (...ids: string[]) => ids.map((id) => ({_key: key(), _type: 'amenityEntry', amenity: ref(id)}))
  docs.push(
    {...sample, _id: 'property-sample-studio-centro', _type: 'property', listingType: 'rental', featured: true,
      title: ls('Estudio amueblado en el centro', 'Furnished studio downtown'), slug: {_type: 'slug', current: 'sample-estudio-centro'},
      summary: lt('Estudio con escritorio y wifi de 200 Mbps. Contrato de 3 a 11 meses.', 'Studio with a desk and 200 Mbps wifi. 3 to 11 month lease.'),
      description: lb(['Ejemplo de ficha de renta de contrato corto.'], ['Example short-term lease listing.']),
      audiences: ['remote-workers', 'professionals'], propertyType: 'studio', bedrooms: 0, bathrooms: 1, maxGuests: 2, builtAreaM2: 38, furnished: true,
      wifiMbps: 200, dedicatedWorkspace: true, beachDistanceKm: 1.1, area: ref('area-playa'), location: {_type: 'geopoint', lat: 20.6296, lng: -87.0739},
      amenities: am('am-wifi', 'am-ac', 'am-kitchen', 'am-washer', 'am-workspace'),
      rental: {_type: 'rentalTerms', currency: 'MXN', monthlyRent: 14500, depositMonths: 1, minLeaseMonths: 3, maxLeaseMonths: 11, availableFrom: '2026-11-15', utilitiesIncluded: ['water', 'internet'], petsPolicy: 'ask'}},
    {...sample, _id: 'property-sample-2br-playacar', _type: 'property', listingType: 'rental',
      title: ls('Departamento de 2 recámaras en Playacar', '2-bedroom apartment in Playacar'), slug: {_type: 'slug', current: 'sample-2br-playacar'},
      summary: lt('Para familias: 2 recámaras, alberca y mascotas permitidas. Contrato de 6 a 11 meses.', 'Family friendly: 2 bedrooms, a pool and pets allowed. 6 to 11 month lease.'),
      description: lb(['Ejemplo de ficha de renta de contrato corto.'], ['Example short-term lease listing.']),
      audiences: ['families'], propertyType: 'apartment', bedrooms: 2, bathrooms: 2, maxGuests: 5, builtAreaM2: 95, furnished: true, petFriendly: true, parkingSpaces: 1, wifiMbps: 100, beachDistanceKm: 1.6,
      area: ref('area-playacar'), location: {_type: 'geopoint', lat: 20.6118, lng: -87.0985},
      amenities: am('am-pool', 'am-wifi', 'am-ac', 'am-kitchen', 'am-parking', 'am-washer', 'am-security'),
      rental: {_type: 'rentalTerms', currency: 'MXN', monthlyRent: 28000, depositMonths: 1, minLeaseMonths: 6, maxLeaseMonths: 11, availableFrom: '2026-12-01', utilitiesIncluded: ['water'], petsPolicy: 'allowed'}},
    {...sample, _id: 'property-sample-loft', _type: 'property', listingType: 'rental',
      title: ls('Loft con terraza cerca de la Quinta', 'Loft with terrace near Fifth Avenue'), slug: {_type: 'slug', current: 'sample-loft-terraza'},
      summary: lt('Loft con terraza, ideal para una temporada larga. Contrato de 1 a 6 meses.', 'Loft with a terrace, ideal for a long season. 1 to 6 month lease.'),
      description: lb(['Ejemplo de ficha de renta de contrato corto.'], ['Example short-term lease listing.']),
      audiences: ['professionals', 'students'], propertyType: 'studio', bedrooms: 1, bathrooms: 1, maxGuests: 2, builtAreaM2: 52, furnished: true, wifiMbps: 150, beachDistanceKm: 0.8,
      area: ref('area-playa'), location: {_type: 'geopoint', lat: 20.6281, lng: -87.0759},
      amenities: am('am-wifi', 'am-ac', 'am-terrace', 'am-kitchen'),
      rental: {_type: 'rentalTerms', currency: 'MXN', monthlyRent: 18000, depositMonths: 1, minLeaseMonths: 1, maxLeaseMonths: 6, availableFrom: '2026-11-01', utilitiesIncluded: ['water', 'electricity', 'internet'], petsPolicy: 'none'}},
    {...sample, _id: 'property-sample-condo-sale', _type: 'property', listingType: 'sale', featured: true,
      title: ls('Condominio de 2 recámaras a pasos del mar', '2-bedroom condo steps from the sea'), slug: {_type: 'slug', current: 'sample-condo-venta'},
      summary: lt('Condominio amueblado con alberca y gimnasio. Estimación de ingresos por renta vacacional disponible.', 'Furnished condo with a pool and gym. Vacation-rental income estimate available.'),
      description: lb(['Ejemplo de ficha de propiedad en venta.'], ['Example for-sale listing.']),
      audiences: ['investors', 'second-home'], propertyType: 'apartment', bedrooms: 2, bathrooms: 2, builtAreaM2: 98, furnished: true, parkingSpaces: 1, beachDistanceKm: 0.3,
      area: ref('area-playa'), location: {_type: 'geopoint', lat: 20.6349, lng: -87.0771},
      amenities: am('am-pool', 'am-gym', 'am-elevator', 'am-ac', 'am-security'),
      sale: {_type: 'saleTerms', currency: 'USD', askingPrice: 345000, annualPropertyTax: 1100, monthlyMaintenanceFee: 4200, ownership: 'fideicomiso', yearBuilt: 2019, financing: ['cash', 'seller financing'],
        incomeEstimate: {_type: 'rentalIncomeEstimate', currency: 'USD', monthlyRevenue: 2400, occupancyPercent: 62, basis: ls('Estimación de ejemplo', 'Example estimate')}}},
    {...sample, _id: 'property-sample-house-sale', _type: 'property', listingType: 'sale',
      title: ls('Casa de 3 recámaras con jardín', '3-bedroom house with a garden'), slug: {_type: 'slug', current: 'sample-casa-venta'},
      summary: lt('Casa para vivir todo el año, cerca de escuelas y servicios.', 'A house to live in year-round, close to schools and services.'),
      description: lb(['Ejemplo de ficha de propiedad en venta.'], ['Example for-sale listing.']),
      audiences: ['first-home', 'families'], propertyType: 'house', bedrooms: 3, bathrooms: 2.5, builtAreaM2: 160, landAreaM2: 210, furnished: false, parkingSpaces: 2, petFriendly: true, beachDistanceKm: 2.4,
      area: ref('area-playa'), location: {_type: 'geopoint', lat: 20.6402, lng: -87.0804},
      amenities: am('am-garden', 'am-parking', 'am-ac', 'am-security'),
      sale: {_type: 'saleTerms', currency: 'MXN', askingPrice: 7900000, annualPropertyTax: 9800, ownership: 'escritura', yearBuilt: 2016, financing: ['cash', 'bank mortgage']}},
    {...sample, _id: 'property-sample-land-sale', _type: 'property', listingType: 'sale',
      title: ls('Terreno de 450 m² cerca de la playa', '450 m² plot near the beach'), slug: {_type: 'slug', current: 'sample-terreno-venta'},
      summary: lt('Terreno con servicios para casa o desarrollo pequeño.', 'Serviced plot for a house or a small development.'),
      description: lb(['Ejemplo de ficha de propiedad en venta.'], ['Example for-sale listing.']),
      audiences: ['investors', 'second-home'], propertyType: 'land', landAreaM2: 450, beachDistanceKm: 1.9,
      area: ref('area-playa'), location: {_type: 'geopoint', lat: 20.6451, lng: -87.0699},
      sale: {_type: 'saleTerms', currency: 'MXN', askingPrice: 2150000, annualPropertyTax: 3200, ownership: 'escritura', financing: ['cash']}},
  )

  const tx = client.transaction()
  for (const d of docs) tx.createOrReplace(d as never)
  const res = await tx.commit()
  console.log(`Seeded ${res.results.length} documents`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
