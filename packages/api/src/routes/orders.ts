import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { generateProblemCode } from '@reparala/shared'
import { z } from 'zod'
import { sendPushNotification } from '../services/notifications'

const createOrderSchema = z.object({
  category: z.enum(['HID', 'CIV', 'SER', 'VID']),
  subcategory: z.string().min(2).max(10),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  serviceAddress: z.string(),
  serviceCity: z.string(),
  serviceLat: z.number().optional(),
  serviceLng: z.number().optional(),
})

export async function orderRoutes(app: FastifyInstance) {

  // POST /orders — Cliente abre chamado
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    const body = createOrderSchema.parse(request.body)

    // Busca o cliente
    const client = await prisma.client.findUnique({ where: { userId: payload.userId } })
    if (!client) {
      return reply.code(403).send({ success: false, error: 'Perfil de cliente não encontrado' })
    }

    // Gera o código estruturado do problema
    const problemCode = generateProblemCode(body.category as any, body.subcategory, body.priority as any)

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        problemCode,
        category: body.category,
        subcategory: body.subcategory,
        description: body.description,
        priority: body.priority,
        serviceAddress: body.serviceAddress,
        serviceCity: body.serviceCity,
        serviceLat: body.serviceLat,
        serviceLng: body.serviceLng,
      },
      include: { client: { include: { user: true } }, media: true },
    })

    // Notifica todos os admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', pushToken: { not: null } } })
    for (const admin of admins) {
      await sendPushNotification(
        admin.pushToken!,
        '🔔 Novo chamado aberto',
        `${body.category} — ${problemCode}`,
        { orderId: order.id }
      )
    }

    return reply.code(201).send({ success: true, data: order, error: null })
  })

  // GET /orders — Lista chamados (filtros por status, clientId, techId)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    const { status, page = '1', limit = '20' } = request.query as any

    const where: any = {}

    // Cliente só vê seus próprios chamados
    if (payload.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId: payload.userId } })
      if (client) where.clientId = client.id
    }

    // Técnico só vê chamados atribuídos a ele + chamados abertos da sua especialidade
    if (payload.role === 'TECHNICIAN') {
      const tech = await prisma.technician.findUnique({ where: { userId: payload.userId } })
      if (tech) {
        where.OR = [
          { technicianId: tech.id },
          { status: 'OPEN', category: { in: tech.specialties } },
        ]
      }
    }

    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: { include: { user: { select: { name: true, phone: true } } } },
          technician: { include: { user: { select: { name: true, phone: true } } } },
          media: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ])

    return reply.send({ success: true, data: { orders, total, page: Number(page), limit: Number(limit) }, error: null })
  })

  // GET /orders/:id — Detalhes de um chamado
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        technician: { include: { user: true } },
        media: { orderBy: { createdAt: 'asc' } },
        dispatchLogs: { orderBy: { offeredAt: 'desc' }, take: 10 },
      },
    })

    if (!order) return reply.code(404).send({ success: false, error: 'Chamado não encontrado' })

    return reply.send({ success: true, data: order, error: null })
  })

  // PATCH /orders/:id/assign — Admin atribui técnico (despacho manual)
  app.patch('/:id/assign', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Apenas admins podem atribuir chamados' })
    }

    const { id } = request.params as { id: string }
    const { technicianId } = request.body as { technicianId: string }

    const tech = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { user: true },
    })
    if (!tech) return reply.code(404).send({ success: false, error: 'Técnico não encontrado' })

    const order = await prisma.order.update({
      where: { id },
      data: {
        technicianId,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
      },
    })

    // Registra no log de despacho
    await prisma.dispatchLog.create({
      data: { orderId: id, technicianId, action: 'manual' },
    })

    // Notifica o técnico
    if (tech.user.pushToken) {
      await sendPushNotification(
        tech.user.pushToken,
        '🔔 Novo chamado disponível!',
        `${order.category} — ${order.problemCode}`,
        { orderId: order.id, screen: 'OrderOffer' }
      )
    }

    return reply.send({ success: true, data: order, error: null })
  })

  // PATCH /orders/:id/accept — Técnico aceita chamado
  app.patch('/:id/accept', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    const { id } = request.params as { id: string }

    const tech = await prisma.technician.findUnique({ where: { userId: payload.userId } })
    if (!tech) return reply.code(403).send({ success: false, error: 'Perfil de técnico não encontrado' })

    const order = await prisma.order.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
      include: { client: { include: { user: true } } },
    })

    await prisma.technician.update({ where: { id: tech.id }, data: { status: 'BUSY' } })
    await prisma.dispatchLog.updateMany({
      where: { orderId: id, technicianId: tech.id, action: 'manual' },
      data: { action: 'accepted', respondedAt: new Date() },
    })

    // Notifica o cliente
    if (order.client.user.pushToken) {
      await sendPushNotification(
        order.client.user.pushToken,
        '✅ Técnico a caminho!',
        'Seu chamado foi aceito. O técnico está indo até você.',
        { orderId: order.id, screen: 'OrderStatus' }
      )
    }

    return reply.send({ success: true, data: order, error: null })
  })

  // PATCH /orders/:id/reject — Técnico recusa chamado
  app.patch('/:id/reject', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as any

    const tech = await prisma.technician.findUnique({ where: { userId: payload.userId } })
    if (!tech) return reply.code(403).send({ success: false, error: 'Perfil de técnico não encontrado' })

    await prisma.order.update({ where: { id }, data: { status: 'OPEN', technicianId: null } })
    await prisma.dispatchLog.create({ data: { orderId: id, technicianId: tech.id, action: 'rejected', respondedAt: new Date() } })

    // Notifica admin para reatribuir
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', pushToken: { not: null } } })
    for (const admin of admins) {
      await sendPushNotification(admin.pushToken!, '⚠️ Chamado recusado', `Técnico recusou ${id.slice(-6)}. Reatribuir?`, { orderId: id })
    }

    return reply.send({ success: true, data: null, error: null })
  })

  // PATCH /orders/:id/status — Técnico atualiza status
  app.patch('/:id/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    const payload = request.user as any

    const validStatuses = ['EN_ROUTE', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ success: false, error: 'Status inválido' })
    }

    const data: any = { status }
    if (status === 'IN_PROGRESS') data.startedAt = new Date()
    if (status === 'COMPLETED') data.completedAt = new Date()

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { client: { include: { user: true } }, technician: true },
    })

    // Se completou, libera o técnico
    if (status === 'COMPLETED' && order.technicianId) {
      await prisma.technician.update({
        where: { id: order.technicianId },
        data: { status: 'AVAILABLE', jobsTotal: { increment: 1 }, jobsToday: { increment: 1 } },
      })
    }

    // Notifica cliente sobre mudanças importantes
    const notifyOn: Record<string, string> = {
      EN_ROUTE: '🚗 Técnico a caminho!',
      IN_PROGRESS: '🔧 Serviço iniciado',
      AWAITING_APPROVAL: '✅ Serviço concluído — avalie agora',
    }
    if (notifyOn[status] && order.client.user.pushToken) {
      await sendPushNotification(order.client.user.pushToken, notifyOn[status], order.problemCode, { orderId: id })
    }

    return reply.send({ success: true, data: order, error: null })
  })

  // POST /orders/:id/media — Salva referência de mídia
  app.post('/:id/media', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { url, phase, mimeType } = request.body as { url: string; phase: string; mimeType?: string }

    const media = await prisma.orderMedia.create({
      data: { orderId: id, url, phase: phase as any, mimeType },
    })

    return reply.code(201).send({ success: true, data: media, error: null })
  })

  // POST /orders/:id/rate — Cliente avalia o serviço
  app.post('/:id/rate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { rating, comment } = request.body as { rating: number; comment?: string }

    if (rating < 1 || rating > 5) {
      return reply.code(400).send({ success: false, error: 'Avaliação deve ser entre 1 e 5' })
    }

    const order = await prisma.order.update({
      where: { id },
      data: { rating, ratingComment: comment, status: 'COMPLETED' },
    })

    // Atualiza média de rating do técnico
    if (order.technicianId) {
      const ratings = await prisma.order.findMany({
        where: { technicianId: order.technicianId, rating: { not: null } },
        select: { rating: true },
      })
      const avg = ratings.reduce((s, o) => s + o.rating!, 0) / ratings.length
      await prisma.technician.update({ where: { id: order.technicianId }, data: { rating: avg } })
    }

    return reply.send({ success: true, data: order, error: null })
  })
}
