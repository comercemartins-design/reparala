'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/Badge'

const STATUS_LABELS: Record<string, string> = {
  DISPATCHED: '📡 Despachado',
  ACCEPTED: '✅ Aceito',
  EN_ROUTE: '🚗 A caminho',
  IN_PROGRESS: '🔧 Em execução',
  AWAITING_APPROVAL: '⏳ Aguard. aprovação',
}

const TECH_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-50 border-green-200',
  BUSY: 'bg-orange-50 border-orange-200',
  OFFLINE: 'bg-gray-50 border-gray-200',
}

export default function TechQueuePage() {
  const [techs, setTechs] = useState<any[]>([])
  const [allTechs, setAllTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reassigning, setReassigning] = useState<string | null>(null)
  const [selectedTechs, setSelectedTechs] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 20000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [queueRes, allRes] = await Promise.all([
        api.get<any>('/technicians/queue'),
        api.get<any>('/technicians'),
      ])
      setTechs(queueRes.data || [])
      setAllTechs(allRes.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleReassign(orderId: string, newTechId: string) {
    if (!newTechId) return
    if (!window.confirm('Reatribuir este chamado para outro técnico?')) return
    setReassigning(orderId)
    try {
      await api.patch(`/orders/${orderId}/assign`, { technicianId: newTechId })
      setFeedback('Chamado reatribuído com sucesso! ✅')
      setSelectedTechs((prev) => { const next = { ...prev }; delete next[orderId]; return next })
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha ao reatribuir'))
    } finally {
      setReassigning(null)
    }
  }

  async function handleUnassign(orderId: string) {
    if (!window.confirm('Remover técnico deste chamado? Voltará para a fila.')) return
    setReassigning(orderId)
    try {
      await api.patch(`/orders/${orderId}/unassign`, {})
      setFeedback('Técnico removido. Chamado voltou para a fila. ✅')
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha'))
    } finally {
      setReassigning(null)
    }
  }

  const techsWithOrders = techs.filter((t) => t.orders?.length > 0)
  const totalActive = techs.reduce((sum, t) => sum + (t.orders?.length || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fila de Técnicos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalActive} chamado(s) ativo(s) em andamento</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Atualiza a cada 20s
          </span>
          <button onClick={loadData} className="text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
            🔄 Atualizar
          </button>
          <Link href="/dashboard/technicians" className="text-sm text-brand-700 border border-brand-200 px-3 py-2 rounded-xl hover:bg-brand-50 transition">
            ← Técnicos
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${feedback.startsWith('Erro') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando fila...</p></div>
      ) : techsWithOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-500 font-semibold">Nenhum chamado ativo no momento.</p>
          <p className="text-gray-400 text-sm mt-1">Todos os técnicos estão livres.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {techsWithOrders.map((tech) => (
            <div key={tech.id} className={`rounded-2xl border p-5 ${TECH_STATUS_COLORS[tech.status] || 'bg-white border-gray-100'}`}>
              {/* Header do técnico */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{tech.user?.name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{tech.user?.name}</p>
                    <p className="text-xs text-gray-500">{tech.city} · ⭐ {tech.rating?.toFixed(1) || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded-lg border">
                    {tech.orders.length} chamado(s)
                  </span>
                  <StatusBadge status={tech.status} />
                  <Link href={`/dashboard/technicians/${tech.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                    Editar →
                  </Link>
                </div>
              </div>

              {/* Chamados do técnico */}
              <div className="space-y-2">
                {tech.orders.map((order: any) => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/dashboard/orders/${order.id}`} className="font-mono text-sm font-bold text-gray-900 hover:text-brand-700">
                            {order.problemCode}
                          </Link>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-gray-500">{order.client?.user?.name} · {order.serviceCity || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABELS[order.status] || order.status} · {new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={selectedTechs[order.id] || ''}
                          onChange={(e) => setSelectedTechs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[160px]"
                          disabled={reassigning === order.id}
                        >
                          <option value="">Reatribuir para...</option>
                          {allTechs.filter((t) => t.id !== tech.id).map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.user?.name} [{t.status}]
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReassign(order.id, selectedTechs[order.id])}
                          disabled={!selectedTechs[order.id] || reassigning === order.id}
                          className="text-xs font-semibold px-2.5 py-1.5 bg-brand-800 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition"
                        >
                          {reassigning === order.id ? '...' : 'Mover'}
                        </button>
                        <button
                          onClick={() => handleUnassign(order.id)}
                          disabled={reassigning === order.id}
                          className="text-xs font-semibold px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Técnicos sem chamados ativos */}
      {techs.filter((t) => t.orders?.length === 0 && t.status !== 'OFFLINE').length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Técnicos disponíveis / sem chamados ativos</p>
          <div className="flex flex-wrap gap-2">
            {techs.filter((t) => t.orders?.length === 0 && t.status !== 'OFFLINE').map((tech) => (
              <div key={tech.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-sm font-semibold text-green-800">{tech.user?.name}</span>
                <span className="text-xs text-green-600">{tech.city}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
