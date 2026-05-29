'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const CLIENT_TYPES = [
  { key: 'RESIDENCE', label: '🏠 Residência' },
  { key: 'COMPANY',   label: '🏢 Empresa' },
  { key: 'CONDO',     label: '🏗️ Condomínio' },
]

export default function NewClientPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState('RESIDENCE')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [condoName, setCondoName] = useState('')
  const [condoBlock, setCondoBlock] = useState('')
  const [condoFloor, setCondoFloor] = useState('')
  const [condoUnit, setCondoUnit] = useState('')

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
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nome, email e senha são obrigatórios')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.post(`/clients`, {
        name,
        email,
        password,
        phone: phone || undefined,
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
        } : {}),
      })
      router.push('/dashboard/clients')
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
          <h1 className="text-xl font-bold text-gray-900">Cadastrar novo cliente</h1>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-800">Acesso e Dados Pessoais</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">⚠️ {error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email de acesso *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="cliente@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha provisória *</label>
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

        <button type="submit" disabled={saving || (password.length > 0 && password.length < 6)}
          className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
          {saving ? 'Cadastrando...' : 'Cadastrar cliente'}
        </button>
      </form>
    </div>
  )
}
