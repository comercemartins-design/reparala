import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'TECHNICIAN', 'ADMIN']).default('CLIENT'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

async function supabaseSignIn(email: string, password: string) {
  const url = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`
  const anonKey = process.env.SUPABASE_ANON_KEY ?? ''
  const keyDebug = `len=${anonKey.length} start=${anonKey.slice(0, 20)} end=${anonKey.slice(-10)}`
  let rawText = ''
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    rawText = await res.text()
    const json = JSON.parse(rawText) as any
    if (!res.ok) return { user: null, error: `HTTP ${res.status}: ${rawText.slice(0, 300)} | key: ${keyDebug}` }
    return { user: json.user as { id: string }, error: null }
  } catch (e: any) {
    return { user: null, error: `fetch exception: ${e?.message} | raw: ${rawText.slice(0, 200)} | key: ${keyDebug}` }
  }
}

async function supabaseCreateUser(email: string, password: string, metadata: Record<string, string>) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
    }
  )
  const json = await res.json() as any
  if (!res.ok) return { user: null, error: json.msg || json.error_description || 'Erro ao criar usuário' }
  return { user: json as { id: string }, error: null }
}

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const { user: authUser, error } = await supabaseCreateUser(body.email, body.password, {
      name: body.name,
      role: body.role,
    })

    if (error || !authUser) {
      return reply.code(400).send({ success: false, error })
    }

    const user = await prisma.user.create({
      data: {
        supabaseId: authUser.id,
        name: body.name,
        phone: body.phone,
        role: body.role,
      },
    })

    const token = app.jwt.sign({
      userId: user.id,
      supabaseId: user.supabaseId,
      role: user.role,
      name: user.name,
    })

    return reply.code(201).send({
      success: true,
      data: { token, user: { id: user.id, name: user.name, role: user.role } },
      error: null,
    })
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const { user: authUser, error } = await supabaseSignIn(body.email, body.password)

    if (error || !authUser) {
      return reply.code(401).send({ success: false, error, debug_sbError: error })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      include: { client: true, technician: true },
    })

    if (!user) {
      return reply.code(404).send({ success: false, error: 'Usuário não encontrado no sistema' })
    }

    const token = app.jwt.sign({
      userId: user.id,
      supabaseId: user.supabaseId,
      role: user.role,
      name: user.name,
    })

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          client: user.client,
          technician: user.technician,
        },
      },
      error: null,
    })
  })

  // GET /auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { client: true, technician: true },
    })

    if (!user) {
      return reply.code(404).send({ success: false, error: 'Usuário não encontrado' })
    }

    return reply.send({ success: true, data: user, error: null })
  })

  // PATCH /auth/push-token
  app.patch('/push-token', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as any
    const { pushToken } = request.body as { pushToken: string }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { pushToken },
    })

    return reply.send({ success: true, data: null, error: null })
  })
}
