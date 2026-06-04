'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge } from '@/components/Badge'
import Lightbox from '@/components/Lightbox'

const STATUS_FLOW = [
  { key: 'OPEN',               label: 'Chamado aberto' },
  { key: 'DISPATCHED',         label: 'Técnico notificado' },
  { key: 'ACCEPTED',           label: 'Técnico confirmado' },
  { key: 'EN_ROUTE',           label: 'A caminho' },
  { key: 'IN_PROGRESS',        label: 'Em execução' },
  { key: 'AWAITING_APPROVAL',  label: 'Aguardando aprovação' },
  { key: 'COMPLETED',          label: 'Concluído' },
]

const ALL_STATUSES = [
  { value: 'OPEN',               label: '📋 Aberto' },
  { value: 'DISPATCHED',         label: '📡 Despachado' },
  { value: 'ACCEPTED',           label: '✅ Aceito' },
  { value: 'EN_ROUTE',           label: '🚗 A caminho' },
  { value: 'IN_PROGRESS',        label: '🔧 Em execução' },
  { value: 'AWAITING_APPROVAL',  label: '⏳ Aguard. aprovação' },
  { value: 'COMPLETED',          label: '✅ Concluído' },
  { value: 'CANCELLED',          label: '❌ Cancelado' },
]

const CATEGORY_LABELS: Record<string, string> = {
  HID: '💧 Hidráulica', CIV: '🏗️ Civil', SER: '🔩 Serralheria', ELE: '⚡ Elétrica',
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  RESIDENCE: '🏠 Residência', COMPANY: '🏢 Empresa', CONDO: '🏗️ Condomínio',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [technicians, setTechnicians] = useState<any[]>([])
  const [selectedTech, setSelectedTech] = useState('')
  const [forceStatus, setForceStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 20000)
    return () => clearInterval(interval)
  }, [id])

  async function loadData() {
    try {
      const [orderRes, techRes] = await Promise.all([
        api.get<any>(`/orders/${id}`),
        api.get<any>('/technicians'),
      ])
      setOrder(orderRes.data)
      setTechnicians(techRes.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!selectedTech) return
    setWorking(true)
    try {
      await api.patch(`/orders/${id}/assign`, { technicianId: selectedTech })
      setFeedback('Técnico atribuído com sucesso! ✅')
      setSelectedTech('')
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha ao atribuir'))
    } finally {
      setWorking(false)
    }
  }

  async function handleUnassign() {
    if (!window.confirm('Remover o técnico deste chamado? O chamado voltará para a fila.')) return
    setWorking(true)
    try {
      await api.patch(`/orders/${id}/unassign`, {})
      setFeedback('Técnico removido. Chamado voltou para a fila. ✅')
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha'))
    } finally {
      setWorking(false)
    }
  }

  async function handleForceStatus() {
    if (!forceStatus) return
    const statusLabel = ALL_STATUSES.find((s) => s.value === forceStatus)?.label || forceStatus
    if (!window.confirm(`Forçar status para "${statusLabel}"? Esta ação altera o registro do chamado.`)) return
    setWorking(true)
    try {
      await api.patch(`/orders/${id}/admin-status`, { status: forceStatus })
      setFeedback(`Status alterado para ${statusLabel} ✅`)
      setForceStatus('')
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha'))
    } finally {
      setWorking(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancelar este chamado? Esta ação não pode ser desfeita.')) return
    setWorking(true)
    try {
      await api.patch(`/orders/${id}/admin-status`, { status: 'CANCELLED' })
      setFeedback('Chamado cancelado ✅')
      await loadData()
    } catch (err: any) {
      setFeedback('Erro: ' + (err.message || 'falha'))
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando chamado...</p></div>
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Chamado não encontrado.</p>
        <Link href="/dashboard/orders" className="text-brand-600 text-sm mt-2 block">← Voltar</Link>
      </div>
    )
  }

  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === order.status)
  const isActive = !['COMPLETED', 'CANCELLED'].includes(order.status)

  // Técnicos compatíveis com a especialidade + todos (para forçar)
  const compatibleTechs = technicians.filter((t: any) => t.specialties?.includes(order.category))
  const allTechs = technicians

  return (
    <div>
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{order.problemCode}</h1>
          <p className="text-gray-500 text-sm">{CATEGORY_LABELS[order.category]} · {order.serviceCity}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PriorityBadge status={order.priority} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${feedback.startsWith('Erro') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="xl:col-span-2 space-y-6">

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Progresso</h2>
              {order.completedAt && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                  ⏱ Duração: {Math.floor((new Date(order.completedAt).getTime() - new Date(order.createdAt).getTime()) / 3600000)}h {Math.floor(((new Date(order.completedAt).getTime() - new Date(order.createdAt).getTime()) % 3600000) / 60000)}m
                </span>
              )}
            </div>
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {STATUS_FLOW.map((step, i) => {
                const done = i < currentIndex || order.status === step.key || order.status === 'COMPLETED'
                const current = i === currentIndex

                let timestamp: string | null = null
                if (step.key === 'OPEN' && order.createdAt) timestamp = new Date(order.createdAt).toLocaleString('pt-BR')
                if (step.key === 'DISPATCHED' && order.dispatchedAt) timestamp = new Date(order.dispatchedAt).toLocaleString('pt-BR')
                if (step.key === 'ACCEPTED' && order.acceptedAt) timestamp = new Date(order.acceptedAt).toLocaleString('pt-BR')
                if (step.key === 'EN_ROUTE' && order.enRouteAt) timestamp = new Date(order.enRouteAt).toLocaleString('pt-BR')
                if (step.key === 'IN_PROGRESS' && order.startedAt) timestamp = new Date(order.startedAt).toLocaleString('pt-BR')
                if (step.key === 'AWAITING_APPROVAL' && order.completedAt) timestamp = new Date(order.completedAt).toLocaleString('pt-BR')
                if (step.key === 'COMPLETED' && order.status === 'COMPLETED') timestamp = new Date(order.updatedAt).toLocaleString('pt-BR')

                return (
                  <div key={step.key} className="flex items-start">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-2
                        ${done ? 'bg-green-500 border-green-500 text-white' :
                          current ? 'bg-brand-800 border-brand-800 text-white' :
                          'bg-white border-gray-300 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <p className={`text-[10px] text-center mt-1 max-w-[72px] leading-tight
                        ${current ? 'font-bold text-brand-800' : done ? 'text-green-600' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {timestamp && (
                        <p className="text-[9px] text-center mt-1 text-gray-500 whitespace-pre-line max-w-[72px]">
                          {timestamp.replace(', ', '\n')}
                        </p>
                      )}
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 w-6 flex-shrink-0 mt-6 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detalhes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Detalhes do chamado</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Código" value={order.problemCode} mono />
              <InfoRow label="Categoria" value={CATEGORY_LABELS[order.category] || order.category} />
              <InfoRow label="Tipo de local" value={CLIENT_TYPE_LABELS[order.client?.type] || '—'} />
              <InfoRow label="Endereço" value={order.serviceAddress || '—'} />
              <InfoRow label="Cidade" value={order.serviceCity || '—'} />
              <InfoRow label="Aberto em" value={new Date(order.createdAt).toLocaleString('pt-BR')} />
            </div>

            {order.client?.type === 'CONDO' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-3">🏗️ DADOS DO CONDOMÍNIO</p>
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  {order.client?.condoName && (
                    <div>
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Condomínio</p>
                      <p className="text-sm font-bold text-blue-900">{order.client.condoName}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {order.client?.condoBlock && <div className="bg-white rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-400 font-semibold">Bloco</p><p className="text-sm font-bold text-gray-800">{order.client.condoBlock}</p></div>}
                    {order.client?.condoFloor != null && <div className="bg-white rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-400 font-semibold">Andar</p><p className="text-sm font-bold text-gray-800">{order.client.condoFloor}º</p></div>}
                    {order.client?.condoUnit && <div className="bg-white rounded-lg p-2.5 text-center"><p className="text-[10px] text-gray-400 font-semibold">Unidade</p><p className="text-sm font-bold text-gray-800">{order.client.condoUnit}</p></div>}
                  </div>
                  <p className="text-xs text-blue-500">📍 {order.serviceAddress}, {order.serviceCity}</p>
                </div>
              </div>
            )}

            {order.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-1">Descrição</p>
                <p className="text-sm text-gray-700 leading-relaxed">{order.description}</p>
              </div>
            )}
          </div>

          {/* Fotos */}
          {order.media?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">Fotos do Serviço</h2>
              {order.media.some((m: any) => m.phase === 'REPORT') && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-600 mb-2">📸 Fotos do Problema (Cliente)</p>
                  <div className="flex gap-3 flex-wrap">
                    {order.media.filter((m: any) => m.phase === 'REPORT').map((m: any) => (
                      <button key={m.id} onClick={() => setLightboxUrl(m.url)} className="focus:outline-none">
                        <img src={m.url} alt="Problema" className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:scale-105 hover:shadow-lg transition cursor-zoom-in" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {order.media.some((m: any) => m.phase === 'COMPLETION') && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-600 mb-2 mt-2">✅ Fotos da Conclusão (Técnico)</p>
                  <div className="flex gap-3 flex-wrap">
                    {order.media.filter((m: any) => m.phase === 'COMPLETION').map((m: any) => (
                      <button key={m.id} onClick={() => setLightboxUrl(m.url)} className="focus:outline-none">
                        <img src={m.url} alt="Conclusão" className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:scale-105 hover:shadow-lg transition cursor-zoom-in" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Técnico responsável */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Técnico responsável</h2>
            {order.technician ? (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.technician.user?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{order.technician.city}</p>
                  </div>
                  <Link href={`/dashboard/technicians/${order.technician.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                    Editar →
                  </Link>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={order.technician.status} />
                  {order.technician.rating && <span className="text-sm text-amber-600 font-semibold">⭐ {order.technician.rating.toFixed(1)}</span>}
                </div>
                {order.technician.user?.phone && (
                  <a href={`https://wa.me/55${order.technician.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 hover:bg-green-100 transition">
                    <span>💬</span>
                    <span className="font-semibold">{order.technician.user.phone}</span>
                    <span className="ml-auto text-xs text-green-500">WhatsApp →</span>
                  </a>
                )}
                {isActive && (
                  <button onClick={handleUnassign} disabled={working}
                    className="mt-3 w-full text-sm font-semibold py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50">
                    Remover técnico
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum técnico atribuído</p>
            )}
          </div>

          {/* Atribuir / Reatribuir técnico */}
          {isActive && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-1">{order.technician ? 'Reatribuir técnico' : 'Atribuir técnico'}</h2>
              <p className="text-xs text-gray-400 mb-4">
                {order.technician ? 'O técnico atual será substituído.' : 'Selecione um técnico para despachar.'}
              </p>
              <div className="mb-2">
                <p className="text-xs text-gray-500 font-semibold mb-1">Compatíveis com {order.category}</p>
                <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Selecione...</option>
                  {compatibleTechs.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.name} — {t.city} [{t.status}] (⭐{t.rating?.toFixed(1) || '—'})
                    </option>
                  ))}
                </select>
              </div>
              {compatibleTechs.length === 0 && allTechs.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-orange-500 font-semibold mb-1">Todos os técnicos (fora da especialidade)</p>
                  <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Selecione...</option>
                    {allTechs.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.user?.name} — {t.city} [{t.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={handleAssign} disabled={!selectedTech || working}
                className="w-full bg-brand-800 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                {working ? 'Processando...' : '📡 Atribuir e notificar'}
              </button>
            </div>
          )}

          {/* Controle administrativo de processo */}
          {isActive && (
            <div className="bg-white rounded-2xl border border-amber-100 p-6">
              <h2 className="font-bold text-amber-800 mb-1">Controle de processo</h2>
              <p className="text-xs text-amber-600 mb-4">Forçar mudança de status manualmente.</p>
              <select value={forceStatus} onChange={(e) => setForceStatus(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="">Selecione o status alvo...</option>
                {ALL_STATUSES.filter((s) => s.value !== order.status && s.value !== 'CANCELLED').map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button onClick={handleForceStatus} disabled={!forceStatus || working}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50 mb-3">
                {working ? 'Processando...' : '⚡ Forçar status'}
              </button>
              <button onClick={handleCancel} disabled={working}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                ❌ Cancelar chamado
              </button>
            </div>
          )}

          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Cliente</h2>
            <p className="font-semibold text-gray-900">{order.client?.user?.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{CLIENT_TYPE_LABELS[order.client?.type] || '—'}</p>
            {order.client?.user?.phone ? (
              <a href={`https://wa.me/55${order.client.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 hover:bg-green-100 transition">
                <span>💬</span>
                <span className="font-semibold">{order.client.user.phone}</span>
                <span className="ml-auto text-xs text-green-500">WhatsApp →</span>
              </a>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Sem telefone</p>
            )}
            {order.rating && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Avaliação do serviço</p>
                <p className="text-lg text-amber-400">{'★'.repeat(order.rating)}{'☆'.repeat(5 - order.rating)}</p>
                {order.ratingComment && <p className="text-xs text-gray-500 mt-1 italic">"{order.ratingComment}"</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-semibold mb-0.5">{label}</p>
      <p className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
