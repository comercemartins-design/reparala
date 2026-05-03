'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/Badge'

const SPECIALTY_OPTIONS = [
  { key: 'HID', label: '💧 Hidráulica' },
  { key: 'CIV', label: '🏗️ Civil' },
  { key: 'SER', label: '🔩 Serralheria' },
  { key: 'VID', label: '🪟 Vidraçaria' },
]

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export default function TechnicianEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [tech, setTech] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Campos editáveis
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    loadTech()
  }, [id])

  async function loadTech() {
    setLoading(true)
    try {
      const res = await api.get<any>(`/technicians/${id}`)
      const found = res.data
      setTech(found)
      setName(found.user?.name || '')
      setPhone(found.user?.phone || '')
      setCity(found.city || '')
      setSpecialties(found.specialties || [])
    } catch {
      setError('Erro ao carregar técnico')
    } finally {
      setLoading(false)
    }
  }

  function toggleSpecialty(key: string) {
    setSpecialties((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    if (specialties.length === 0) { setError('Selecione ao menos uma especialidade'); return }
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.patch(`/technicians/${id}`, {
        name,
        phone: phone || undefined,
        city,
        specialties,
        ...(newPassword ? { password: newPassword } : {}),
      })
      setSuccess('Dados salvos com sucesso! ✅')
      setNewPassword('')
      await loadTech()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando técnico...</p>
      </div>
    )
  }

  if (!tech) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Técnico não encontrado.</p>
        <button onClick={() => router.back()} className="text-brand-600 text-sm mt-2">← Voltar</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Editar técnico</h1>
          <p className="text-gray-500 text-sm">Cadastrado em {new Date(tech.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <StatusBadge status={tech.status} />
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">⭐ {tech.rating?.toFixed(1) || '—'}</p>
          <p className="text-xs text-amber-600 font-semibold mt-1">Avaliação</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{tech.jobsTotal ?? 0}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1">Total de jobs</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{tech.jobsToday ?? 0}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">Hoje</p>
        </div>
      </div>

      {/* WhatsApp */}
      {phone && (
        <a
          href={whatsappLink(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6 hover:bg-green-100 transition"
        >
          <span className="text-2xl">💬</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">Abrir conversa no WhatsApp</p>
            <p className="text-xs text-green-600">{phone}</p>
          </div>
          <span className="text-green-600 text-sm font-semibold">Abrir →</span>
        </a>
      )}

      {/* Formulário */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h2 className="font-bold text-gray-800 text-base mb-2">Informações pessoais</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">⚠️ {error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{success}</div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone / WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade de atuação</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder="São Paulo"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Especialidades</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSpecialty(opt.key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                  specialties.includes(opt.key)
                    ? 'border-brand-800 bg-brand-50 text-brand-800'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span>{opt.label}</span>
                {specialties.includes(opt.key) && <span className="ml-auto text-brand-600">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <h2 className="font-bold text-gray-800 text-base mb-4">Redefinir senha</h2>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            minLength={newPassword ? 6 : undefined}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
          />
          {newPassword && newPassword.length < 6 && (
            <p className="text-xs text-red-500 mt-1">Mínimo de 6 caracteres</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60 mt-2"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Histórico de chamados */}
      {tech.orders?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-5">
          <h2 className="font-bold text-gray-800 mb-4">Últimos chamados</h2>
          <div className="space-y-2">
            {tech.orders.map((order: any) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition border border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{order.problemCode}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.rating && <span className="text-sm text-amber-500">{'★'.repeat(order.rating)}</span>}
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
