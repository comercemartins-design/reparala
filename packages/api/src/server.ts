import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import cron from 'node-cron'

import { authRoutes } from './routes/auth'
import { orderRoutes } from './routes/orders'
import { technicianRoutes } from './routes/technicians'
import { clientRoutes } from './routes/clients'
import { checkStaleDispatches } from './services/dispatch'

const app = Fastify({ logger: true })

// ── PLUGINS ──────────────────────────────────────────────────
await app.register(helmet)
await app.register(cors, {
  origin: true,
  credentials: true,
})
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'reparala-dev-secret-change-in-production',
})

// ── MIDDLEWARE DE AUTH ───────────────────────────────────────
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ success: false, error: 'Token inválido ou expirado' })
  }
})

// ── ROTAS ─────────────────────────────────────────────────────
await app.register(authRoutes, { prefix: '/auth' })
await app.register(orderRoutes, { prefix: '/orders' })
await app.register(technicianRoutes, { prefix: '/technicians' })
await app.register(clientRoutes, { prefix: '/clients' })

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  app: 'Repara Lá API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}))

// ── CRON: Verifica chamados travados a cada 5 minutos ────────
cron.schedule('*/5 * * * *', async () => {
  app.log.info('Cron: verificando chamados em DISPATCHED sem resposta...')
  await checkStaleDispatches()
})

// ── START ─────────────────────────────────────────────────────
const PORT = Number(process.env.API_PORT) || 3001

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 Repara Lá API rodando em http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health\n`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
