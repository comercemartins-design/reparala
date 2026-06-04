'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

const PERM_LABELS: Record<string, string> = {
  MANAGE_ORDERS: '📋 Chamados',
  MANAGE_CLIENTS: '👥 Clientes',
  MANAGE_TECHNICIANS: '👷 Técnicos',
  MANAGE_ADMINS: '👑 Admins',
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const delay = setTimeout(() => loadAdmins(), 400)
    return () => clearTimeout(delay)
  }, [searchQuery])

  async function loadAdmins() {
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''
      const res = await api.get<any>(`/admins${params}`)
      setAdmins(res.data.data.admins || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remover o admin "${name}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try {
      await api.delete(`/admins/${id}`)
      await loadAdmins()
    } catch (err: any) {
      alert(err.message || 'Erro ao remover admin')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administradores</h1>
          <p className="text-gray-500 text-sm mt-0.5">{admins.length} administrador(es) cadastrado(s)</p>
        </div>
        <Link
          href="/dashboard/admins/new"
          className="bg-brand-800 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition flex items-center gap-2 text-sm"
        >
          <span>➕</span> Cadastrar Admin
        </Link>
      </div>

      {/* Busca */}
      <div className="relative w-full md:w-72 mb-6">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Carregando administradores...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissões</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado em</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-800">{admin.name}</p>
                      {admin.phone && <p className="text-xs text-gray-400">{admin.phone}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {admin.permissions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.map((p: string) => (
                            <span key={p} className="text-xs bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full border border-brand-100">
                              {PERM_LABELS[p] || p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full border border-purple-100">
                          👑 Super Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/admins/${admin.id}`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition">
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(admin.id, admin.name)}
                          disabled={deletingId === admin.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                          {deletingId === admin.id ? '...' : 'Remover'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {admins.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500">Nenhum administrador encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
