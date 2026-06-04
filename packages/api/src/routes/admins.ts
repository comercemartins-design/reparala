import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

const ALL_PERMISSIONS = ['MANAGE_ORDERS', 'MANAGE_CLIENTS', 'MANAGE_TECHNICIANS', 'MANAGE_ADMINS']

function sbAdminUrl(path: string) {
  return `${process.env.SUPABASE_URL}/auth/v1/admin/${path}`
}
function sbAdminHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // GET /admins
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { search } = request.query as any
    const where: any = { role: 'ADMIN' }
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const usersFull = await prisma.user.findMany({
      where,
      select: { id: true, name: true, phone: true, permissions: true, createdAt: true, supabaseId: true },
      orderBy: { createdAt: 'desc' },
    })

    // Tenta buscar emails do Supabase via HTTP direto
    let sbUsers: any[] = []
    try {
      const res = await fetch(sbAdminUrl('users?per_page=1000'), { headers: sbAdminHeaders() })
      if (res.ok) {
        const json = await res.json() as any
        sbUsers = json.users || []
      }
    } catch {}

    const admins = usersFull.map((u) => {
      const authUser = sbUsers.find((su: any) => su.id === u.supabaseId)
      return { id: u.id, name: u.name, phone: u.phone, permissions: u.permissions, createdAt: u.createdAt, email: authUser?.email || 'Sem email' }
    })

    return reply.send({ success: true, data: { admins }, error: null })
  })

  // GET /admins/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id, role: 'ADMIN' },
      select: { id: true, name: true, phone: true, permissions: true, createdAt: true, supabaseId: true },
    })
    if (!user) return reply.code(404).send({ success: false, error: 'Admin não encontrado' })

    let email = 'Sem email'
    try {
      const res = await fetch(sbAdminUrl(`users/${user.supabaseId}`), { headers: sbAdminHeaders() })
      if (res.ok) {
        const json = await res.json() as any
        email = json.email || 'Sem email'
      }
    } catch {}

    return reply.send({ success: true, data: { ...user, email }, error: null })
  })

  // POST /admins
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { name, email, password, phone, permissions = [] } = request.body as any
    const validPerms = (permissions as string[]).filter((p) => ALL_PERMISSIONS.includes(p))

    const res = await fetch(sbAdminUrl('users'), {
      method: 'POST',
      headers: sbAdminHeaders(),
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'ADMIN', name } }),
    })
    const authData = await res.json() as any
    if (!res.ok) {
      return reply.code(400).send({ success: false, error: authData.msg || authData.error_description || 'Erro ao criar auth' })
    }

    const user = await prisma.user.create({
      data: { supabaseId: authData.id, role: 'ADMIN', name, phone: phone || null, permissions: validPerms },
    })

    return reply.code(201).send({ success: true, data: user, error: null })
  })

  // PATCH /admins/:id
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
        await fetch(sbAdminUrl(`users/${user.supabaseId}`), {
          method: 'PUT',
          headers: sbAdminHeaders(),
          body: JSON.stringify({ password }),
        })
      } catch (err) {
        console.error('Erro ao atualizar senha:', err)
      }
    }

    return reply.send({ success: true, data: null, error: null })
  })

  // DELETE /admins/:id
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    if (id === payload.userId) return reply.code(400).send({ success: false, error: 'Não é possível remover a si mesmo' })

    const user = await prisma.user.findUnique({ where: { id, role: 'ADMIN' } })
    if (!user) return reply.code(404).send({ success: false, error: 'Admin não encontrado' })

    try {
      await fetch(sbAdminUrl(`users/${user.supabaseId}`), { method: 'DELETE', headers: sbAdminHeaders() })
    } catch (err) {
      console.error('Erro ao remover auth:', err)
    }

    await prisma.user.delete({ where: { id } })
    return reply.send({ success: true, data: null, error: null })
  })
}
