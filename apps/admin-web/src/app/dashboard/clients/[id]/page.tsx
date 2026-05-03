'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/Badge'

const CLIENT_TYPES = [
  { key: 'RESIDENCE', label: '🏠 Residência' },
  { key: 'COMPANY',   label: '🏢 Empresa' },
  { key: 'CONDO',     label: '🏗️ Condomínio' },
]

const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aguardando', DISPATCHED: 'Despachado', ACCEPTED: 'Aceito',
  EN_ROUTE: 'A caminho', IN_PROGRESS: 'Em execução',
  AWAITING_APPROVAL: 'Aguard. aprovação', COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado', REJECTED: 'Recusado',
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [type, setType] = useState('RESIDENCE')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [condoName, setCondoName] = useState('')
  const [condoBlock, setCondoBlock] = useState('')
  const [condoFloor, setCondoFloor] = useState('')
  const [condoUnit, setCondoUnit] = useState('')

  useEffect(() => { loadClient() }, [id])

  async function loadClient() {
    setLoading(true)
    try {
      const res = await api.get<any>(`/clients/${id}`)
      const c = res.data
      setClient(c)
      setName(c.user?.name || '')
      setPhone(c.user?.phone || '')
      setType(c.type || 'RESIDENCE')
      setAddressLine(c.addressLine || '')
      setCity(c.city || '')
      setState(c.state || '')
      setZipCode(c.zipCode || '')
      setCondoName(c.condoName || '')
      setCondoBlock(c.condoBlock || '')
      setCondoFloor(c.condoFloor != null ? String(c.condoFloor) : '')
      setCondoUnit(c.condoUnit || '')
    } catch {
      setError('Erro ao carregar cliente')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddressLine(data.logradouro || addressLine)
        setCity(data.localidade || city)
        setState(data.uf || state)
      }
    } catch {}
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.patch(`/clients/${id}`, {
        name,
        phone: phone || undefined,
        ...(newPassword ? { password: newPassword } : {}),
        type,
        addressLine,
        city,
        state,
        zipCode: zipCode.replace(/\D/g, ''),
        ...(type === 'CONDO' ? {
          condoName: condoName || undefined,
          condoBlock: condoBlock || undefined,
          condoFloor: condoFloor ? Number(condoFloor) : undefined,
          condoUnit: condoUnit || undefined,
        } : {
          condoName: null,
          condoBlock: null,
          condoFloor: null,
          condoUnit: null,
        }),
      })
      setSuccess('Dados salvos com sucesso! ✅')
      setNewPassword('')
      await loadClient()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando cliente...</p></div>
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Cliente não encontrado.</p>
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
          <h1 className="text-xl font-bold text-gray-900">Editar cliente</h1>
          <p className="text-gray-500 text-sm">{client._count?.orders ?? 0} chamado(s) no histórico</p>
        </div>
        <StatusBadge status={client.type} />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone / WhatsApp</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nova senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
            </label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
            {newPassword && newPassword.length < 6 && <p className="text-xs text-red-500 mt-1">Mínimo de 6 caracteres</p>}
          </div>
        </div>

        {/* Tipo de local */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800">Endereço</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de local</label>
            <div className="flex gap-2">
              {CLIENT_TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    type === t.key ? 'border-brand-800 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">CEP</label>
              <input type="text" value={zipCode}
                onChange={(e) => { setZipCode(e.target.value); fetchCep(e.target.value) }}
                placeholder="00000-000" maxLength={9}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
              <input type="text" value={state} onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SP" maxLength={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Endereço</label>
            <input type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Rua, número"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          {/* Campos de condomínio */}
          {type === 'CONDO' && (
            <div className="pt-3 border-t border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-700">🏗️ Dados do Condomínio</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do condomínio</label>
                <input type="text" value={condoName} onChange={(e) => setCondoName(e.target.value)}
                  placeholder="Residencial das Flores"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bloco</label>
                  <input type="text" value={condoBlock} onChange={(e) => setCondoBlock(e.target.value)} placeholder="A"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Andar</label>
                  <input type="number" value={condoFloor} onChange={(e) => setCondoFloor(e.target.value)} placeholder="3"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidade</label>
                  <input type="text" value={condoUnit} onChange={(e) => setCondoUnit(e.target.value)} placeholder="301"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Histórico de chamados */}
      {client.orders?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-5">
          <h2 className="font-bold text-gray-800 mb-4">Últimos chamados</h2>
          <div className="space-y-2">
            {client.orders.map((order: any) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition border border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{order.problemCode}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
