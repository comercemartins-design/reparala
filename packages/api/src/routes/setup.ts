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

    // Usa anon key para autenticar (caminho padrão do cliente)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Tenta login com as credenciais fornecidas
    const { data: signed, error: signError } = await supabase.auth.signInWithPassword({ email, password })

    if (signError || !signed?.user) {
      // Login falhou — tenta criar conta via service role
      const adminClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError || !created?.user) {
        return reply.code(400).send({
          success: false,
          error: 'Não foi possível autenticar nem criar o usuário',
          signInError: signError?.message,
          createError: createError?.message,
        })
      }

      // Criou no Supabase — upsert no banco
      const user = await prisma.user.upsert({
        where: { supabaseId: created.user.id },
        update: { role: 'ADMIN', name: name || email.split('@')[0], permissions: [] },
        create: { supabaseId: created.user.id, name: name || email.split('@')[0], role: 'ADMIN', permissions: [] },
      })
      return reply.send({ success: true, data: { id: user.id, name: user.name, role: user.role }, method: 'created' })
    }

    // Login funcionou — upsert no banco com role ADMIN
    const user = await prisma.user.upsert({
      where: { supabaseId: signed.user.id },
      update: { role: 'ADMIN', name: name || signed.user.email?.split('@')[0] || '', permissions: [] },
      create: { supabaseId: signed.user.id, name: name || signed.user.email?.split('@')[0] || '', role: 'ADMIN', permissions: [] },
    })

    return reply.send({ success: true, data: { id: user.id, name: user.name, role: user.role }, method: 'promoted' })
  })
}
