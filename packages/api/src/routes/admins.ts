import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function adminRoutes(app: FastifyInstance) {
  // GET /admins — Lista administradores (admin)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

    try {
      const usersFull = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, phone: true, createdAt: true, supabaseId: true },
        orderBy: { createdAt: 'desc' },
      })

      // Buscar e-mails no Supabase
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data } = await sb.auth.admin.listUsers()

      const finalAdmins = usersFull.map((u) => {
        const authUser = data.users.find((su) => su.id === u.supabaseId)
        return {
          id: u.id,
          name: u.name,
          phone: u.phone,
          createdAt: u.createdAt,
          email: authUser?.email || 'Sem email'
        }
      })

      return reply.send({ success: true, data: { admins: finalAdmins }, error: null })
    } catch (err) {
      console.error('Erro ao listar admins:', err)
      // Fallback sem email
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, phone: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: { admins }, error: null })
    }
  })

  // POST /admins — Admin cadastra um novo admin
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const payload = request.user as any
      if (payload.role !== 'ADMIN') return reply.code(403).send({ success: false, error: 'Acesso negado' })

      const { name, email, password, phone } = request.body as any

      // 1. Cria usuário no Supabase
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: authData, error: authError } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', name }
      })
      if (authError || !authData.user) {
        return reply.code(400).send({ success: false, error: authError?.message || 'Erro ao criar auth' })
      }

      // 2. Cria usuário no Prisma como ADMIN
      const user = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          role: 'ADMIN',
          name,
          phone: phone || null,
        }
      })

      return reply.code(201).send({ success: true, data: user, error: null })
    } catch (err: any) {
      console.error('Erro ao criar admin:', err)
      return reply.code(500).send({ success: false, error: err.message || 'Erro interno no servidor' })
    }
  })
}
