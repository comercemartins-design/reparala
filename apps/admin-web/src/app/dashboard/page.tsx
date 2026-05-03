'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge, PriorityBadge } from '@/components/Badge'

interface DashboardData {
  orders: any[]
  technicians: any[]
  orderTotal: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [ordersRes, techRes] = await Promise.all([
        api.get<any>('/orders?limit=10'),
        api.get<any>('/technicians'),
      ])
      setData({
        orders: ordersRes.data.orders || [],
        orderTotal: ordersRes.data.total || 0,
        technicians: techRes.data || [],
      })
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">🔧</div>
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const orders = data?.orders || []
  const techs = data?.technicians || []

  const stats = {
    open: orders.filter((o) => o.status === 'OPEN').length,
    dispatched: orders.filter((o) => o.status === 'DISPATCHED').length,
    inProgress: orders.filter((o) => ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    availTechs: techs.filter((t: any) => t.status === 'AVAILABLE').length,
    totalTechs: techs.length,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-500 text-sm mt-1">Atualizado em tempo real · últimos 20 chamados</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <MetricCard icon="📋" value={stats.open} label="Aguardando" color="yellow" />
        <MetricCard icon="📡" value={stats.dispatched} label="Despachados" color="blue" />
        <MetricCard icon="🔧" value={stats.inProgress} label="Em andamento" color="orange" />
        <MetricCard icon="✅" value={stats.completed} label="Concluídos" color="green" />
        <MetricCard icon="👷" value={`${stats.availTechs}/${stats.totalTechs}`} label="Técnicos disp." color="indigo" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chamados recentes */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Chamados recentes</h2>
            <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 8).map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{CATEGORY_ICONS[order.category] || '🔧'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 font-mono">{order.problemCode}</p>
                    <p className="text-xs text-gray-500 truncate">{order.serviceCity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge status={order.priority} />
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhum chamado ainda</p>
            )}
          </div>
        </div>

        {/* Técnicos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Técnicos</h2>
            <Link href="/dashboard/technicians" className="text-sm text-brand-600 hover:underline">
              Gerenciar →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {techs.slice(0, 8).map((tech: any) => (
              <div key={tech.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{tech.user?.name}</p>
                  <p className="text-xs text-gray-400">{tech.city}</p>
                </div>
                <StatusBadge status={tech.status} />
              </div>
            ))}
            {techs.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhum técnico cadastrado</p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <Link
              href="/dashboard/technicians/new"
              className="w-full block text-center bg-brand-800 hover:bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              + Cadastrar técnico
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  HID: '💧', CIV: '🏗️', SER: '🔩', VID: '🪟',
}

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-50 text-yellow-700',
  blue:   'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  green:  'bg-green-50 text-green-700',
  indigo: 'bg-indigo-50 text-indigo-700',
}

function MetricCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${COLOR_CLASSES[color] || 'bg-gray-50 text-gray-700'}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-1 opacity-80">{label}</div>
    </div>
  )
}
