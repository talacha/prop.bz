/**
 * Attaches the rendered sample photos and 360° tours to the demo sale listings.
 * 1) cd tools/sample-media && npm install && npm run render      (writes tools/sample-media/out/*.jpg)
 * 2) cd studio && npx sanity exec scripts/seed-sample-media.ts --with-user-token
 */
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-02-01'})
const OUT = join(process.cwd(), '..', 'tools', 'sample-media', 'out')
const key = () => Math.random().toString(36).slice(2, 12)
const ls = (es: string, en: string) => ({_type: 'localeString', es, en})
const ref = (id: string) => ({_type: 'reference', _ref: id})

const cache = new Map<string, string>()
async function upload(file: string): Promise<string> {
  const hit = cache.get(file)
  if (hit) return hit
  const asset = await client.assets.upload('image', readFileSync(join(OUT, file)), {filename: file})
  cache.set(file, asset._id)
  return asset._id
}

type Photo = [file: string, room: string, es: string, en: string]
const photo = async ([file, room, es, en]: Photo) => ({
  _key: key(), _type: 'galleryImage', asset: ref(await upload(`${file}.jpg`)), room, alt: ls(es, en),
})

type Link = {to: string; es: string; en: string; yaw: number; pitch?: number}
type Scene = {id: string; es: string; en: string; file: string; yaw?: number; links: Link[]}
const tourOf = async (scenes: Scene[]) => ({
  _type: 'virtualTour',
  startScene: scenes[0].id,
  scenes: await Promise.all(scenes.map(async (s) => ({
    _key: key(), _type: 'tourScene', id: s.id, title: ls(s.es, s.en), initialYaw: s.yaw ?? 0,
    panorama: {_type: 'image', asset: ref(await upload(`pano-${s.file}.jpg`))},
    links: s.links.map((l) => ({_key: key(), _type: 'tourLink', to: l.to, label: ls(l.es, l.en), yaw: l.yaw, pitch: l.pitch ?? -6})),
  }))),
})

const JOBS: {id: string; photos: Photo[]; scenes: Scene[]}[] = [
  {
    id: 'property-sample-house-sale',
    photos: [
      ['casa-front', 'exterior', 'Fachada de la casa con jardín al frente', 'Front of the house with its front garden'],
      ['casa-living', 'living', 'Sala abierta con sofá, sillones y televisión', 'Open living room with sofa, armchairs and TV'],
      ['casa-kitchen', 'kitchen', 'Cocina y comedor de concepto abierto', 'Open-plan kitchen and dining area'],
      ['casa-bedroom', 'bedroom', 'Recámara principal con cama king', 'Primary bedroom with a king bed'],
      ['casa-garden', 'exterior', 'Alberca y jardín trasero', 'Pool and back garden'],
      ['casa-terrace', 'terrace', 'Terraza con camastros junto a la alberca', 'Terrace with loungers by the pool'],
    ],
    scenes: [
      {id: 'living', es: 'Sala y comedor', en: 'Living and dining', file: 'casa-living', yaw: -20, links: [
        {to: 'kitchen', es: 'Cocina', en: 'Kitchen', yaw: -58}, {to: 'garden', es: 'Jardín y alberca', en: 'Garden and pool', yaw: 160}]},
      {id: 'kitchen', es: 'Cocina', en: 'Kitchen', file: 'casa-kitchen', yaw: 98, links: [
        {to: 'living', es: 'Sala y comedor', en: 'Living and dining', yaw: 74}, {to: 'garden', es: 'Jardín y alberca', en: 'Garden and pool', yaw: 122}]},
      {id: 'garden', es: 'Jardín y alberca', en: 'Garden and pool', file: 'casa-garden', yaw: 180, links: [
        {to: 'living', es: 'Entrar a la sala', en: 'Go inside', yaw: 180, pitch: 0}]},
    ],
  },
  {
    id: 'property-sample-condo-sale',
    photos: [
      ['condo-tower', 'exterior', 'Torre frente al mar con alberca', 'Beachfront tower with a pool'],
      ['condo-living', 'living', 'Sala con ventanal hacia el mar', 'Living room with a window wall facing the sea'],
      ['condo-kitchen', 'kitchen', 'Cocina y comedor', 'Kitchen and dining area'],
      ['condo-bedroom', 'bedroom', 'Recámara con vista al mar', 'Bedroom with a sea view'],
      ['condo-view', 'terrace', 'Vista al mar desde el balcón', 'Sea view from the balcony'],
      ['condo-pool', 'amenities', 'Alberca y camastros del edificio', 'Building pool and loungers'],
    ],
    scenes: [
      {id: 'living', es: 'Sala y cocina', en: 'Living room and kitchen', file: 'condo-living', yaw: 160, links: [
        {to: 'balcony', es: 'Balcón', en: 'Balcony', yaw: 169, pitch: -4}, {to: 'bedroom', es: 'Recámara', en: 'Bedroom', yaw: -90, pitch: -4}]},
      {id: 'bedroom', es: 'Recámara principal', en: 'Primary bedroom', file: 'condo-bedroom', yaw: 115, links: [
        {to: 'living', es: 'Sala', en: 'Living room', yaw: 135, pitch: -4}]},
      {id: 'balcony', es: 'Balcón con vista al mar', en: 'Sea-view balcony', file: 'condo-balcony', yaw: 180, links: [
        {to: 'living', es: 'Entrar a la sala', en: 'Go inside', yaw: 0, pitch: -2}]},
    ],
  },
  {
    id: 'property-sample-land-sale',
    photos: [
      ['land-road', 'exterior', 'Frente del terreno sobre la calle', 'Plot frontage on the street'],
      ['land-a', 'exterior', 'Terreno visto desde la esquina oriente', 'The plot from the east corner'],
      ['land-b', 'exterior', 'Terreno visto desde la esquina poniente', 'The plot from the west corner'],
      ['land-boundary', 'exterior', 'Linderos marcados con estacas', 'Boundary marked with stakes'],
      ['land-elevated', 'neighborhood', 'Vista elevada del terreno y su entorno', 'Elevated view of the plot and surroundings'],
      ['land-sunset', 'neighborhood', 'El terreno al atardecer', 'The plot at sunset'],
    ],
    scenes: [
      {id: 'plot', es: 'Centro del terreno', en: 'Middle of the plot', file: 'land-center', yaw: 0, links: [
        {to: 'street', es: 'Frente a la calle', en: 'Street frontage', yaw: 180, pitch: -3}]},
      {id: 'street', es: 'Frente a la calle', en: 'Street frontage', file: 'land-street', yaw: 0, links: [
        {to: 'plot', es: 'Entrar al terreno', en: 'Walk into the plot', yaw: 0, pitch: -3}]},
    ],
  },
]

async function main() {
  for (const job of JOBS) {
    const gallery = []
    for (const p of job.photos) gallery.push(await photo(p))
    const tour = await tourOf(job.scenes)
    await client.patch(job.id).set({gallery, tour}).commit()
    console.log(`${job.id}: ${gallery.length} photos, ${tour.scenes.length} tour rooms`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
