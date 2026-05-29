'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/Badge'

const SPECIALTY_LABELS: Record<string, string> = {
  HID: '💧', CIV: '🏗️', SER: '🔩', ELE: '⚡',
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadTechnicians()
    }, 400)
    return () => clearTimeout(delayDebounceFn)
  }, [statusFilter, searchQuery])

  async function loadTechnicians() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      
      const query = params.toString()
      const res = await api.get<any>(`/technicians${query ? `?${query}` : ''}`)
      setTechnicians(res.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function toggleAvailability(tech: any) {
    setTogglingId(tech.id)
    try {
      const newAvail = tech.status !== 'AVAILABLE'
      await api.patch(`/technicians/${tech.id}/availability`, { available: newAvail })
      await loadTechnicians()
    } catch {
      alert('Erro ao alterar disponibilidade')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Técnicos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{technicians.length} técnico(s) cadastrado(s)</p>
        </div>
        <Link
          href="/dashboard/technicians/new"
          className="bg-brand-800 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + Cadastrar técnico
        </Link>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'Todos' },
            { value: 'AVAILABLE', label: '✅ Disponível' },
            { value: 'BUSY', label: '🔧 Ocupado' },
            { value: 'OFFLINE', label: '⚫ Offline' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                statusFilter === f.value
                  ? 'bg-brand-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="Buscar por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Técnico</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Especialidades</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Cidade</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Avaliação</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Jobs</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Carregando técnicos...</td>
              </tr>
            ) : technicians.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Nenhum técnico encontrado.{' '}
                  <Link href="/dashboard/technicians/new" className="text-brand-600 hover:underline">
                    Cadastrar agora
                  </Link>
                </td>
              </tr>
            ) : (
              technicians.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tech.user?.name}</p>
                      <p className="text-xs text-gray-400">{tech.user?.phone || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(tech.specialties || []).map((sp: string) => (
                        <span key={sp} title={sp} className="text-lg">{SPECIALTY_LABELS[sp] || sp}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tech.city}</td>
                  <td className="px-4 py-3">
                    {tech.rating ? (
                      <span className="text-sm font-semibold text-amber-600">⭐ {tech.rating.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {tech.jobsTotal ?? 0} total · {tech.jobsToday ?? 0} hoje
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tech.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tech.user?.phone && (
                        <a
                          href={`https://wa.me/55${tech.user.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="text-green-600 hover:text-green-700 text-lg"
                        >
                          💬
                        </a>
                      )}
                      <button
                        onClick={() => toggleAvailability(tech)}
                        disabled={togglingId === tech.id || tech.status === 'BUSY'}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${
                          tech.status === 'AVAILABLE'
                            ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {togglingId === tech.id ? '...' : tech.status === 'AVAILABLE' ? 'Desligar' : 'Ligar'}
                      </button>
                      <Link
                        href={`/dashboard/technicians/${tech.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition"
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
