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
import { adminRoutes } from './routes/admins'
import { setupRoutes } from './routes/setup'
import { checkStaleDispatches } from './services/dispatch'

const app = Fastify({ logger: true })

async function main() {
  await app.register(helmet)
  await app.register(cors, { origin: true, credentials: true })
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'reparala-dev-secret',
  })

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ success: false, error: 'Token inválido' })
    }
  })

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(orderRoutes, { prefix: '/orders' })
  await app.register(technicianRoutes, { prefix: '/technicians' })
  await app.register(clientRoutes, { prefix: '/clients' })
  await app.register(adminRoutes, { prefix: '/admins' })
  await app.register(setupRoutes, { prefix: '/setup' })

  app.get('/health', async () => ({
    status: 'ok',
    app: 'Repara Lá API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  cron.schedule('*/5 * * * *', async () => {
    await checkStaleDispatches()
  })

  const PORT = Number(process.env.API_PORT) || 3001
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Repara Lá API rodando na porta ${PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})