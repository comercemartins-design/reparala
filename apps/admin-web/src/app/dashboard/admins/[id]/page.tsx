'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const PERMISSIONS = [
  { key: 'MANAGE_ORDERS',       label: '📋 Chamados',  desc: 'Atribuir, cancelar e gerenciar status de chamados' },
  { key: 'MANAGE_CLIENTS',      label: '👥 Clientes',  desc: 'Visualizar e editar dados de clientes' },
  { key: 'MANAGE_TECHNICIANS',  label: '👷 Técnicos',  desc: 'Visualizar, editar e gerenciar técnicos' },
  { key: 'MANAGE_ADMINS',       label: '👑 Admins',    desc: 'Cadastrar e editar outros administradores' },
]

export default function AdminEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [admin, setAdmin] = useState<any>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => { loadAdmin() }, [id])

  async function loadAdmin() {
    try {
      const res = await api.get<any>(`/admins/${id}`)
      const a = res.data
      setAdmin(a)
      setName(a.name || '')
      setPhone(a.phone || '')
      setPermissions(a.permissions || [])
      setIsSuperAdmin(!a.permissions || a.permissions.length === 0)
    } catch {
      setError('Erro ao carregar administrador')
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(key: string) {
    setPermissions((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.patch(`/admins/${id}`, {
        name,
        phone: phone || undefined,
        permissions: isSuperAdmin ? [] : permissions,
        ...(newPassword ? { password: newPassword } : {}),
      })
      setSuccess('Dados salvos com sucesso! ✅')
      setNewPassword('')
      await loadAdmin()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando...</p></div>
  if (!admin) return <div className="text-center py-20"><p className="text-gray-500">Admin não encontrado.</p><button onClick={() => router.back()} className="text-brand-600 text-sm mt-2">← Voltar</button></div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Editar administrador</h1>
          <p className="text-gray-500 text-sm">{admin.email} · cadastrado em {new Date(admin.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800">Dados pessoais</h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">⚠️ {error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input type="text" value={admin.email} readOnly
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
            </label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={newPassword ? 6 : undefined}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
            {newPassword && newPassword.length < 6 && <p className="text-xs text-red-500 mt-1">Mínimo de 6 caracteres</p>}
          </div>
        </div>

        {/* Permissões */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800">Nível de acesso</h2>

          <button
            type="button"
            onClick={() => setIsSuperAdmin((v) => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
              isSuperAdmin ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className="text-xl">👑</span>
            <div className="flex-1 text-left">
              <p>Super Administrador</p>
              <p className="text-xs font-normal opacity-70">Acesso total sem restrições</p>
            </div>
            {isSuperAdmin && <span className="text-purple-600">✓</span>}
          </button>

          {!isSuperAdmin && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold mb-3">Módulos com acesso:</p>
              {PERMISSIONS.map((perm) => (
                <button
                  key={perm.key}
                  type="button"
                  onClick={() => togglePermission(perm.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    permissions.includes(perm.key)
                      ? 'border-brand-800 bg-brand-50 text-brand-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{perm.label.split(' ')[0]}</span>
                  <div className="flex-1 text-left">
                    <p>{perm.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs font-normal opacity-70">{perm.desc}</p>
                  </div>
                  {permissions.includes(perm.key) && <span className="text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={saving || (newPassword.length > 0 && newPassword.length < 6)}
          className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
