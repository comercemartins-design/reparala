'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge } from '@/components/Badge'

const STATUSES = [
  { value: '',                  label: 'Todos' },
  { value: 'OPEN',              label: 'Aguardando' },
  { value: 'DISPATCHED',        label: 'Despachados' },
  { value: 'ACCEPTED',          label: 'Aceitos' },
  { value: 'EN_ROUTE',          label: 'A caminho' },
  { value: 'IN_PROGRESS',       label: 'Em execução' },
  { value: 'AWAITING_APPROVAL', label: 'Aguard. aprovação' },
  { value: 'COMPLETED',         label: 'Concluídos' },
  { value: 'CANCELLED',         label: 'Cancelados' },
]

const CATEGORY_ICONS: Record<string, string> = {
  HID: '💧', CIV: '🏗️', SER: '🔩', ELE: '⚡',
}

const CATEGORY_LABELS: Record<string, string> = {
  HID: 'Hidráulica', CIV: 'Civil', SER: 'Serralheria', ELE: 'Elétrica',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadOrders()
    }, 400)
    return () => clearTimeout(delayDebounceFn)
  }, [statusFilter, page, searchQuery])

  async function loadOrders() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '20', page: String(page) })
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await api.get<any>(`/orders?${params}`)
      setOrders(res.data.orders || [])
      setTotal(res.data.total || 0)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} chamado(s) no total</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                statusFilter === s.value
                  ? 'bg-brand-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="Buscar por código..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Código</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Categoria</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Prioridade</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Cidade</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Técnico</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Carregando chamados...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Nenhum chamado encontrado
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-800">{order.problemCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {CATEGORY_ICONS[order.category]} {CATEGORY_LABELS[order.category] || order.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge status={order.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.serviceCity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {order.technician?.user?.name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Página {page} de {Math.ceil(total / 20)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
