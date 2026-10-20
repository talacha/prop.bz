import {z} from 'zod'

// Shared by the client panels and the /api/requests route so both sides agree on the shape.
const base = {
  propertyId: z.string().min(1).max(100),
  slug: z.string().min(1).max(120),
  locale: z.enum(['es', 'en']),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(8).max(30).regex(/^[+\d][\d\s().-]+$/),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(200).optional(), // honeypot: real people leave it empty; the route drops non-empty values
}
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const requestSchema = z.discriminatedUnion('kind', [
  z.object({...base, kind: z.literal('booking'), checkIn: isoDate, checkOut: isoDate, guests: z.number().int().min(1).max(20)}),
  z.object({...base, kind: z.enum(['tour', 'viewing']), date: isoDate, time: z.string().regex(/^\d{2}:\d{2}$/), mode: z.enum(['in-person', 'video'])}),
  z.object({...base, kind: z.literal('application'), leaseMonths: z.number().int().min(1).max(11), moveIn: isoDate}),
])
export type RequestPayload = z.infer<typeof requestSchema>
