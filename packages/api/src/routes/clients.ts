import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createClientProfileSchema = z.object({
  type: z.enum(['RESIDENCE', 'COMPANY', 'CONDO']),
  addressLine: z.string().min(5),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Campos de condomínio
  condoName: z.string().optional(),
  condoBlock: z.string().optional(),
  condoFloor: z.number().optional(),
  condoUnit: z.string().optional(),
})

export async function clientRoutes(app: FastifyInstance) {

  // POST /clients/profile — Cliente completa seu perfil
  app.post('/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
  const payload = request.user as any
  const body = createClientProfileSchema.parse(request.body)

  const client = await prisma.client.upsert({
    where: { userId: payload.userId },
    update: { ...body },
    create: {
      userId: payload.userId,
      ...body,
    },
  })

  return reply.code(201).send({ success: true, data: client, error: null })
})

  // GET /clients — Lista clientes (admin)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const { type, city, page = '1', limit = '20' } = request.query as any
    const where: any = {}
    if (type) where.type = type
    if (city) where.city = { contains: city, mode: 'insensitive' }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true, createdAt: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.client.count({ where }),
    ])

    return reply.send({ success: true, data: { clients, total }, error: null })
  })

  // GET /clients/:id — Detalhes de um cliente
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as any

    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { technician: { include: { user: true } } },
        },
      },
    })

    if (!client) return reply.code(404).send({ success: false, error: 'Cliente não encontrado' })

    return reply.send({ success: true, data: client, error: null })
  })
}
