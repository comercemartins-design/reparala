'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const SPECIALTIES = [
  { key: 'HID', label: 'Hidráulica', icon: '💧' },
  { key: 'CIV', label: 'Civil',      icon: '🏗️' },
  { key: 'SER', label: 'Serralheria',icon: '🔩' },
  { key: 'ELE', label: 'Elétrica', icon: '⚡' },
]

export default function NewTechnicianPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    specialties: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function toggleSpecialty(key: string) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(key)
        ? prev.specialties.filter((s) => s !== key)
        : [...prev.specialties, key],
    }))
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.phone || !form.password || !form.city) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (form.specialties.length === 0) {
      setError('Selecione pelo menos uma especialidade.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await api.post('/technicians', form)
      setSuccess(true)
      setTimeout(() => router.push('/dashboard/technicians'), 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar técnico')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-xl font-bold text-green-700">Técnico cadastrado!</p>
          <p className="text-gray-500 text-sm mt-1">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mb-2">← Voltar</button>
        <h1 className="text-2xl font-bold text-gray-900">Cadastrar técnico</h1>
        <p className="text-gray-500 text-sm mt-1">O técnico receberá um email para acessar o aplicativo.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="João da Silva"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="joao@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha inicial *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade de atuação *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="São Paulo"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Especialidades * (selecione uma ou mais)</label>
            <div className="flex gap-3">
              {SPECIALTIES.map((sp) => (
                <button
                  key={sp.key}
                  type="button"
                  onClick={() => toggleSpecialty(sp.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    form.specialties.includes(sp.key)
                      ? 'border-brand-800 bg-brand-50 text-brand-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{sp.icon}</span>
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60 mt-4"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar técnico →'}
          </button>
        </form>
      </div>
    </div>
  )
}
