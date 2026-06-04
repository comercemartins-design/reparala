import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

const ALL_PERMISSIONS = ['MANAGE_ORDERS', 'MANAGE_CLIENTS', 'MANAGE_TECHNICIANS', 'MANAGE_ADMINS']

export async function adminRoutes(app: FastifyInstance) {
  // GET /admins — Lista administradores
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { search } = request.query as any

    try {
      const where: any = { role: 'ADMIN' }
      if (search) where.name = { contains: search, mode: 'insensitive' }

      const usersFull = await prisma.user.findMany({
        where,
        select: { id: true, name: true, phone: true, permissions: true, createdAt: true, supabaseId: true },
        orderBy: { createdAt: 'desc' },
      })

      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data } = await sb.auth.admin.listUsers()

      const finalAdmins = usersFull.map((u) => {
        const authUser = data.users.find((su) => su.id === u.supabaseId)
        return { id: u.id, name: u.name, phone: u.phone, permissions: u.permissions, createdAt: u.createdAt, email: authUser?.email || 'Sem email' }
      })

      return reply.send({ success: true, data: { admins: finalAdmins }, error: null })
    } catch (err) {
      console.error('Erro ao listar admins:', err)
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, phone: true, permissions: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: { admins }, error: null })
    }
  })

  // GET /admins/:id — Detalhes de um admin
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id, role: 'ADMIN' },
      select: { id: true, name: true, phone: true, permissions: true, createdAt: true, supabaseId: true },
    })
    if (!user) return reply.code(404).send({ success: false, error: 'Admin não encontrado' })

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data } = await sb.auth.admin.listUsers()
      const authUser = data.users.find((su) => su.id === user.supabaseId)
      return reply.send({ success: true, data: { ...user, email: authUser?.email || 'Sem email' }, error: null })
    } catch {
      return reply.send({ success: true, data: { ...user, email: 'Sem email' }, error: null })
    }
  })

  // POST /admins — Admin cadastra novo admin
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { name, email, password, phone, permissions = [] } = request.body as any

    const validPerms = (permissions as string[]).filter((p) => ALL_PERMISSIONS.includes(p))

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: authData, error: authError } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', name },
      })
      if (authError || !authData.user) {
        return reply.code(400).send({ success: false, error: authError?.message || 'Erro ao criar auth' })
      }

      const user = await prisma.user.create({
        data: { supabaseId: authData.user.id, role: 'ADMIN', name, phone: phone || null, permissions: validPerms },
      })

      return reply.code(201).send({ success: true, data: user, error: null })
    } catch (err: any) {
      console.error('Erro ao criar admin:', err)
      return reply.code(500).send({ success: false, error: err.message || 'Erro interno' })
    }
  })

  // PATCH /admins/:id — Edita um admin (nome, telefone, permissões, senha)
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const { name, phone, permissions, password } = request.body as any

    const user = await prisma.user.findUnique({ where: { id, role: 'ADMIN' } })
    if (!user) return reply.code(404).send({ success: false, error: 'Admin não encontrado' })

    const updateData: any = {}
    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone || null
    if (permissions) updateData.permissions = (permissions as string[]).filter((p) => ALL_PERMISSIONS.includes(p))

    await prisma.user.update({ where: { id }, data: updateData })

    if (password && password.length >= 6) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        await sb.auth.admin.updateUserById(user.supabaseId, { password })
      } catch (err) {
        console.error('Erro ao atualizar senha do admin:', err)
      }
    }

    return reply.send({ success: true, data: null, error: null })
  })

  // DELETE /admins/:id — Remove um admin
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    if (id === payload.userId) return reply.code(400).send({ success: false, error: 'Não é possível remover a si mesmo' })

    const user = await prisma.user.findUnique({ where: { id, role: 'ADMIN' } })
    if (!user) return reply.code(404).send({ success: false, error: 'Admin não encontrado' })

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await sb.auth.admin.deleteUser(user.supabaseId)
    } catch (err) {
      console.error('Erro ao remover auth do admin:', err)
    }

    await prisma.user.delete({ where: { id } })
    return reply.send({ success: true, data: null, error: null })
  })
}
