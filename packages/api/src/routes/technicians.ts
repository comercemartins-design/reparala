import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createTechSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string(),
  city: z.string(),
  specialties: z.array(z.enum(['HID', 'CIV', 'SER', 'ELE'])).min(1),
})

export async function technicianRoutes(app: FastifyInstance) {

  // GET /technicians — Lista técnicos (admin)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const { status, specialty, search } = request.query as any

    const where: any = {}
    if (status) where.status = status
    if (specialty) where.specialties = { has: specialty }
    if (search) {
      where.user = { name: { contains: search, mode: 'insensitive' } }
    }

    const technicians = await prisma.technician.findMany({
      where,
      include: { user: { select: { name: true, phone: true, pushToken: true } } },
      orderBy: { rating: 'desc' },
    })

    return reply.send({ success: true, data: technicians, error: null })
  })

  // POST /technicians — Admin cria técnico
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const body = createTechSchema.parse(request.body)

    // Cria no Supabase Auth via HTTP direto
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: body.email, password: body.password, email_confirm: true }),
    })
    const authData = await sbRes.json() as any
    if (!sbRes.ok) {
      app.log.error({ supabaseError: authData, status: sbRes.status }, 'Falha ao criar usuário no Supabase Auth')
      const errMsg = authData.message || authData.msg || authData.error_description || authData.error || JSON.stringify(authData)
      return reply.code(400).send({ success: false, error: errMsg })
    }

    const user = await prisma.user.create({
      data: {
        supabaseId: authData.id,
        name: body.name,
        phone: body.phone,
        role: 'TECHNICIAN',
        technician: {
          create: {
            city: body.city,
            specialties: body.specialties,
          },
        },
      },
      include: { technician: true },
    })

    return reply.code(201).send({ success: true, data: user, error: null })
  })

  // GET /technicians/:id — Detalhes de um técnico (admin)
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const technician = await prisma.technician.findUnique({
      where: { id },
      include: {
        user: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, problemCode: true, status: true, createdAt: true, rating: true },
        },
      },
    })

    if (!technician) return reply.code(404).send({ success: false, error: 'Técnico não encontrado' })

    const allOrders = await prisma.order.findMany({
      where: { technicianId: id },
      select: { status: true, rating: true, dispatchedAt: true, acceptedAt: true, startedAt: true, completedAt: true }
    })
    
    let totalCompleted = 0
    let sumRating = 0
    let ratingCount = 0
    let totalExecTimeMs = 0
    let execTimeCount = 0

    for (const o of allOrders) {
      if (o.status === 'COMPLETED') totalCompleted++
      if (o.rating) { sumRating += o.rating; ratingCount++ }
      if (o.startedAt && o.completedAt) {
        totalExecTimeMs += (o.completedAt.getTime() - o.startedAt.getTime())
        execTimeCount++
      }
    }
    
    const analytics = {
      totalJobs: allOrders.length,
      completedJobs: totalCompleted,
      averageRating: ratingCount > 0 ? (sumRating / ratingCount).toFixed(1) : '—',
      averageExecutionTimeMs: execTimeCount > 0 ? totalExecTimeMs / execTimeCount : null
    }

    return reply.send({ success: true, data: { ...technician, analytics }, error: null })
  })

  // PATCH /technicians/:id — Atualiza dados do técnico (admin)
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { specialties, city, status, name, phone, password } = request.body as any

    const technician = await prisma.technician.update({
      where: { id },
      data: {
        ...(specialties && { specialties }),
        ...(city && { city }),
        ...(status && { status }),
      },
      include: { user: true },
    })

    // Atualiza nome/telefone no User
    if (name || phone !== undefined) {
      await prisma.user.update({
        where: { id: (technician as any).userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        },
      })
    }

    // Atualiza senha no Supabase Auth
    if (password && password.length >= 6) {
      try {
        await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${(technician as any).user.supabaseId}`, {
          method: 'PUT',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        })
      } catch (err) {
        console.error('Erro ao atualizar senha do técnico:', err)
      }
    }

    const updated = await prisma.technician.findUnique({
      where: { id },
      include: { user: true },
    })

    return reply.send({ success: true, data: updated, error: null })
  })

  // PATCH /technicians/:id/availability — Técnico muda disponibilidade
  app.patch('/:id/availability', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { available } = request.body as { available: boolean }

    const technician = await prisma.technician.update({
      where: { id },
      data: { status: available ? 'AVAILABLE' : 'OFFLINE' },
    })

    return reply.send({ success: true, data: technician, error: null })
  })

  // GET /technicians/queue — Fila de chamados por técnico (admin)
  app.get('/queue', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const technicians = await prisma.technician.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        orders: {
          where: { status: { in: ['DISPATCHED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_APPROVAL'] } },
          include: { client: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { status: 'asc' },
    })

    return reply.send({ success: true, data: technicians, error: null })
  })
}
