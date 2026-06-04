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

  // POST /clients — Admin cadastra um novo cliente
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { name, email, password, phone, type, addressLine, city, state, zipCode } = request.body as any

    // 1. Cria usuário no Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (authError || !authData.user) {
      return reply.code(400).send({ success: false, error: authError?.message || 'Erro ao criar auth' })
    }

    // 2. Cria usuário no Prisma
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        role: 'CLIENT',
        name,
        phone,
      }
    })

    // 3. Cria perfil de cliente
    const client = await prisma.client.create({
      data: {
        userId: user.id,
        type: type || 'RESIDENCE',
        addressLine: addressLine || '',
        city: city || '',
        state: state || 'SP',
        zipCode: zipCode || '',
      },
      include: { user: true }
    })

    return reply.code(201).send({ success: true, data: client, error: null })
  })

  // GET /clients — Lista clientes (admin)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const { type, city, search, page = '1', limit = '20' } = request.query as any
    const where: any = {}
    if (type) where.type = type
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (search) where.user = { name: { contains: search, mode: 'insensitive' } }

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

  // PATCH /clients/:id — Admin edita dados do cliente
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as any
    if (payload.role !== 'ADMIN') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const { name, phone, password, type, addressLine, city, state, zipCode,
            condoName, condoBlock, condoFloor, condoUnit } = request.body as any

    const client = await prisma.client.findUnique({ where: { id }, include: { user: true } })
    if (!client) return reply.code(404).send({ success: false, error: 'Cliente não encontrado' })

    // Atualiza perfil do cliente
    await prisma.client.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(addressLine && { addressLine }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(condoName !== undefined && { condoName }),
        ...(condoBlock !== undefined && { condoBlock }),
        ...(condoFloor !== undefined && { condoFloor: condoFloor ? Number(condoFloor) : null }),
        ...(condoUnit !== undefined && { condoUnit }),
      },
    })

    // Atualiza nome/telefone no User
    if (name || phone !== undefined) {
      await prisma.user.update({
        where: { id: (client as any).userId },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
        },
      })
    }

    // Atualiza senha no Supabase Auth
    if (password && password.length >= 6) {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await sb.auth.admin.updateUserById((client as any).user.supabaseId, { password })
    }

    const updated = await prisma.client.findUnique({
      where: { id },
      include: { user: true, _count: { select: { orders: true } } },
    })

    return reply.send({ success: true, data: updated, error: null })
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

    // Busca o email no Supabase
    let email = null;
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data } = await sb.auth.admin.getUserById(client.user.supabaseId)
      if (data?.user) {
        email = data.user.email
      }
    } catch (err) {
      console.error('Erro ao buscar email no Supabase:', err)
    }

    const responseData = {
      ...client,
      user: { ...client.user, email }
    }

    return reply.send({ success: true, data: responseData, error: null })
  })
}
