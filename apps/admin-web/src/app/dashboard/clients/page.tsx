'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/Badge'

const CLIENT_TYPE_ICONS: Record<string, string> = {
  RESIDENCE: '🏠', COMPANY: '🏢', CONDO: '🏗️',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const delay = setTimeout(() => loadClients(), 400)
    return () => clearTimeout(delay)
  }, [typeFilter, searchQuery])

  async function loadClients() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await api.get<any>(`/clients${params.toString() ? `?${params}` : ''}`)
      setClients(res.data?.clients || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="bg-brand-800 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition flex items-center gap-2 text-sm"
        >
          <span>➕</span> Cadastrar Cliente
        </Link>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'Todos' },
            { value: 'RESIDENCE', label: '🏠 Residência' },
            { value: 'COMPANY', label: '🏢 Empresa' },
            { value: 'CONDO', label: '🏗️ Condomínio' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                typeFilter === f.value
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
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Cliente</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Endereço</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Cidade</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Chamados</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Carregando clientes...</td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Nenhum cliente cadastrado</td>
              </tr>
            ) : (
              clients.map((client: any) => (
                <tr key={client.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{client.user?.name}</p>
                      <p className="text-xs text-gray-400">{client.user?.phone || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.type} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px]">
                    <p className="truncate">{client.addressLine || '—'}</p>
                    {client.type === 'CONDO' && client.condoName && (
                      <p className="text-xs text-blue-500 truncate">🏗️ {client.condoName}
                        {client.condoBlock ? ` · Bl. ${client.condoBlock}` : ''}
                        {client.condoUnit ? ` · Ap. ${client.condoUnit}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{client.city} – {client.state}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {client._count?.orders ?? client.orders?.length ?? 0} chamado(s)
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(client.user?.createdAt || client.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {client.user?.phone && (
                        <a
                          href={`https://wa.me/55${client.user.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="text-green-600 hover:text-green-700 text-lg"
                        >
                          💬
                        </a>
                      )}
                      <Link
                        href={`/dashboard/clients/${client.id}`}
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
