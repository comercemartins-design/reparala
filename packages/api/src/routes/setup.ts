import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

// ROTA TEMPORÁRIA — remover após criar o primeiro admin
export async function setupRoutes(app: FastifyInstance) {
  app.post('/init-admin', async (request, reply) => {
    const { supabaseId, name, secret } = request.body as any

    if (secret !== 'reparala-init-2024') {
      return reply.code(403).send({ success: false, error: 'Acesso negado' })
    }

    if (!supabaseId) {
      return reply.code(400).send({ success: false, error: 'supabaseId obrigatório' })
    }

    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: { role: 'ADMIN', name: name || 'Admin', permissions: [] },
      create: { supabaseId, name: name || 'Admin', role: 'ADMIN', permissions: [] },
    })

    return reply.send({ success: true, data: { id: user.id, name: user.name, role: user.role } })
  })
}
