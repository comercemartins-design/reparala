// ============================================================
// REPARA LÁ — Serviço de Despacho
// Verifica chamados travados em DISPATCHED sem resposta
// ============================================================

import { prisma } from '../lib/prisma'
import { sendPushNotification } from './notifications'

const DISPATCH_TIMEOUT_MINUTES = 10

export async function checkStaleDispatches(): Promise<void> {
  const cutoff = new Date(Date.now() - DISPATCH_TIMEOUT_MINUTES * 60 * 1000)

  const staleOrders = await prisma.order.findMany({
    where: {
      status: 'DISPATCHED',
      dispatchedAt: { lt: cutoff },
    },
    include: {
      technician: { include: { user: true } },
    },
  })

  for (const order of staleOrders) {
    console.log(`Chamado travado detectado: ${order.id} — voltando para OPEN`)

    // Volta para aberto
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'OPEN',
        technicianId: null,
        dispatchedAt: null,
      },
    })

    // Registra timeout no log
    if (order.technicianId) {
      await prisma.dispatchLog.create({
        data: {
          orderId: order.id,
          technicianId: order.technicianId,
          action: 'timeout',
          respondedAt: new Date(),
        },
      })
    }

    // Alerta admins para reatribuir
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', pushToken: { not: null } },
    })

    for (const admin of admins) {
      await sendPushNotification(
        admin.pushToken!,
        '⏰ Chamado sem resposta',
        `Chamado ${order.problemCode} voltou para a fila. Reatribuir?`,
        { orderId: order.id }
      )
    }
  }

  if (staleOrders.length > 0) {
    console.log(`${staleOrders.length} chamado(s) reaberto(s) por timeout`)
  }
}
