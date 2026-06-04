import type { FastifyInstance } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma'

// ROTA TEMPORÁRIA — remover após criar o primeiro admin
export async function setupRoutes(app: FastifyInstance) {
  app.post('/init-admin', async (request, reply) => {
    const { email, password, name, secret } = request.body as any

    if (secret !== 'reparala-init-2024') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verifica se já existe no Supabase Auth
    const { data: listData } = await supabase.auth.admin.listUsers()
    const existing = listData?.users?.find((u: any) => u.email === email)

    let supabaseId: string

    if (existing) {
      // Atualiza senha se já existe
      await supabase.auth.admin.updateUserById(existing.id, { password })
      supabaseId = existing.id
    } else {
      // Cria novo
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error || !data.user) {
        return reply.code(400).send({ success: false, error: error?.message })
      }
      supabaseId = data.user.id
    }

    // Verifica se existe no banco local
    let user = await prisma.user.findUnique({ where: { supabaseId } })

    if (user) {
      // Atualiza para ADMIN se necessário
      user = await prisma.user.update({
        where: { supabaseId },
        data: { role: 'ADMIN', name: name || user.name, permissions: [] },
      })
    } else {
      user = await prisma.user.create({
        data: {
          supabaseId,
          name: name || email.split('@')[0],
          role: 'ADMIN',
          permissions: [],
        },
      })
    }

    return reply.send({
      success: true,
      data: { id: user.id, name: user.name, role: user.role },
    })
  })
}
