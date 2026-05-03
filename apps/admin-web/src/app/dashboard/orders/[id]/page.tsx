'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge } from '@/components/Badge'

const STATUS_FLOW = [
  { key: 'OPEN',               label: 'Chamado aberto' },
  { key: 'DISPATCHED',         label: 'Técnico notificado' },
  { key: 'ACCEPTED',           label: 'Técnico confirmado' },
  { key: 'EN_ROUTE',           label: 'A caminho' },
  { key: 'IN_PROGRESS',        label: 'Em execução' },
  { key: 'AWAITING_APPROVAL',  label: 'Aguardando aprovação' },
  { key: 'COMPLETED',          label: 'Concluído' },
]

const CATEGORY_LABELS: Record<string, string> = {
  HID: '💧 Hidráulica', CIV: '🏗️ Civil', SER: '🔩 Serralheria', VID: '🪟 Vidraçaria',
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
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      const [orderRes, techRes] = await Promise.all([
        api.get<any>(`/orders/${id}`),
        api.get<any>('/technicians'),
      ])
      setOrder(orderRes.data)
      const availTechs = (techRes.data || []).filter((t: any) =>
        t.status === 'AVAILABLE' && t.specialties?.includes(orderRes.data?.category)
      )
      setTechnicians(availTechs)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!selectedTech) return
    setAssigning(true)
    try {
      await api.patch(`/orders/${id}/assign`, { technicianId: selectedTech })
      setAssignSuccess('Técnico atribuído com sucesso! ✅')
      setSelectedTech('')
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao atribuir técnico')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando chamado...</p>
      </div>
    )
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
  const canAssign = ['OPEN', 'DISPATCHED'].includes(order.status)

  return (
    <div>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="xl:col-span-2 space-y-6">

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Progresso</h2>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {STATUS_FLOW.map((step, i) => {
                const done = i < currentIndex
                const current = i === currentIndex
                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                        ${done ? 'bg-green-500 border-green-500 text-white' :
                          current ? 'bg-brand-800 border-brand-800 text-white' :
                          'bg-white border-gray-300 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <p className={`text-[10px] text-center mt-1 max-w-[72px] leading-tight
                        ${current ? 'font-bold text-brand-800' : done ? 'text-green-600' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 w-6 flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
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

            {/* Bloco exclusivo de condomínio */}
            {order.client?.type === 'CONDO' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-3 flex items-center gap-1.5">
                  🏗️ DADOS DO CONDOMÍNIO
                </p>
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  {order.client?.condoName && (
                    <div>
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Condomínio</p>
                      <p className="text-sm font-bold text-blue-900">{order.client.condoName}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {order.client?.condoBlock && (
                      <div className="bg-white rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-400 font-semibold">Bloco</p>
                        <p className="text-sm font-bold text-gray-800">{order.client.condoBlock}</p>
                      </div>
                    )}
                    {order.client?.condoFloor != null && (
                      <div className="bg-white rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-400 font-semibold">Andar</p>
                        <p className="text-sm font-bold text-gray-800">{order.client.condoFloor}º</p>
                      </div>
                    )}
                    {order.client?.condoUnit && (
                      <div className="bg-white rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-400 font-semibold">Unidade</p>
                        <p className="text-sm font-bold text-gray-800">{order.client.condoUnit}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-500">
                    📍 {order.serviceAddress}, {order.serviceCity}
                  </p>
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
              <h2 className="font-bold text-gray-800 mb-4">Fotos ({order.media.length})</h2>
              <div className="flex gap-3 flex-wrap">
                {order.media.map((m: any) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={m.url}
                      alt={m.phase}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:scale-105 transition"
                    />
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                      {m.phase === 'REPORT' ? 'Antes' : 'Depois'}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Técnico */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Técnico responsável</h2>
            {order.technician ? (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.technician.user?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{order.technician.city}</p>
                  </div>
                  <Link
                    href={`/dashboard/technicians/${order.technician.id}`}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Editar →
                  </Link>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={order.technician.status} />
                  {order.technician.rating && (
                    <span className="text-sm text-amber-600 font-semibold">
                      ⭐ {order.technician.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                {order.technician.user?.phone ? (
                  <a
                    href={`https://wa.me/55${order.technician.user.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 hover:bg-green-100 transition"
                  >
                    <span>💬</span>
                    <span className="font-semibold">{order.technician.user.phone}</span>
                    <span className="ml-auto text-xs text-green-500">WhatsApp →</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Sem telefone</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum técnico atribuído</p>
            )}
          </div>

          {/* Atribuir técnico */}
          {canAssign && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">Atribuir técnico</h2>
              {assignSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-3 text-sm">
                  {assignSuccess}
                </div>
              )}
              {technicians.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Nenhum técnico disponível com a especialidade necessária ({order.category}).
                </p>
              ) : (
                <>
                  <select
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Selecione um técnico...</option>
                    {technicians.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.user?.name} — {t.city} (⭐{t.rating?.toFixed(1) || '—'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedTech || assigning}
                    className="w-full bg-brand-800 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    {assigning ? 'Atribuindo...' : '📡 Atribuir e notificar'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">Cliente</h2>
            <p className="font-semibold text-gray-900">{order.client?.user?.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{CLIENT_TYPE_LABELS[order.client?.type] || '—'}</p>
            {order.client?.user?.phone ? (
              <a
                href={`https://wa.me/55${order.client.user.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 hover:bg-green-100 transition"
              >
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
                <p className="text-lg text-amber-400">
                  {'★'.repeat(order.rating)}{'☆'.repeat(5 - order.rating)}
                </p>
                {order.ratingComment && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{order.ratingComment}"</p>
                )}
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
