import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createTechSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string(),
  city: z.string(),
  specialties: z.array(z.enum(['HID', 'CIV', 'SER', 'VID'])).min(1),
})

export async function technicianRoutes(app: FastifyInstance) {

  // GET /technicians — Lista técnicos (admin)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const { status, specialty } = request.query as any

    const where: any = {}
    if (status) where.status = status
    if (specialty) where.specialties = { has: specialty }

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

    // Cria no Supabase Auth
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })

    if (error || !authData.user) {
      return reply.code(400).send({ success: false, error: error?.message || 'Erro ao criar usuário' })
    }

    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
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

  // PATCH /technicians/:id — Atualiza dados do técnico
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { specialties, city, status } = request.body as any

    const technician = await prisma.technician.update({
      where: { id },
      data: {
        ...(specialties && { specialties }),
        ...(city && { city }),
        ...(status && { status }),
      },
      include: { user: true },
    })

    return reply.send({ success: true, data: technician, error: null })
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
}
