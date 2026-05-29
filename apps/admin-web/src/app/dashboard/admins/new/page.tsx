'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function NewAdminPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nome, email e senha são obrigatórios')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.post(`/admins`, {
        name,
        email,
        password,
        phone: phone || undefined,
      })
      router.push('/dashboard/admins')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao cadastrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Cadastrar novo admin</h1>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">👑 Dados de Acesso</h2>
          
          <p className="text-sm text-gray-500 mb-4">
            Este usuário terá acesso total a todos os dados do sistema, incluindo clientes, técnicos e chamados.
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">⚠️ {error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email de acesso *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha de acesso *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
            {password && password.length < 6 && <p className="text-xs text-red-500 mt-1">Mínimo de 6 caracteres</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone / WhatsApp</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>
        </div>

        <button type="submit" disabled={saving || (password.length > 0 && password.length < 6)}
          className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
          {saving ? 'Cadastrando...' : 'Cadastrar administrador'}
        </button>
      </form>
    </div>
  )
}
