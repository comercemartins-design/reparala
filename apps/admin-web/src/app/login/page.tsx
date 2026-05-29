'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { storeAuth } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
        email,
        password,
      })
      if (res.data.user.role !== 'ADMIN') {
        setError('Acesso restrito a administradores.')
        return
      }
      storeAuth(res.data.token, res.data.user)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Banner — lado esquerdo */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <Image
          src="/banner.jpg"
          alt="Repara Lá"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Formulário — lado direito */}
      <div className="w-full lg:w-2/5 bg-brand-800 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/banner.jpg"
              alt="Repara Lá"
              width={120}
              height={60}
              className="mx-auto rounded-lg object-cover lg:hidden mb-4"
            />
            <h1 className="text-3xl font-bold text-white">Repara Lá</h1>
            <p className="text-blue-300 mt-1">Painel Administrativo</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Entrar na conta</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@reparala.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-60 mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
