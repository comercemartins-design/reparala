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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let supabaseId: string

    // Tenta criar no Supabase Auth
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        // Já existe — faz signIn para obter o ID
        const { data: signed, error: signError } = await supabase.auth.signInWithPassword({ email, password })
        if (signError || !signed.user) {
          // Tenta resetar a senha via admin
          const { data: users } = await supabase.auth.admin.listUsers()
          const found = users?.users?.find((u: any) => u.email === email)
          if (!found) return reply.code(400).send({ success: false, error: 'Usuário não encontrado no Supabase' })
          await supabase.auth.admin.updateUserById(found.id, { password })
          supabaseId = found.id
        } else {
          supabaseId = signed.user.id
        }
      } else {
        return reply.code(400).send({ success: false, error: createError.message, env: { url: process.env.SUPABASE_URL?.slice(0, 30), keyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) } })
      }
    } else {
      supabaseId = created.user!.id
    }

    // Upsert no banco local
    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: { role: 'ADMIN', name: name || email.split('@')[0], permissions: [] },
      create: { supabaseId, name: name || email.split('@')[0], role: 'ADMIN', permissions: [] },
    })

    return reply.send({ success: true, data: { id: user.id, name: user.name, role: user.role } })
  })
}
