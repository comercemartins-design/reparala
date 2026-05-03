'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao carregar</h2>
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3 mb-4 font-mono break-all">
            {error.message || 'Erro desconhecido'}
          </p>
          <button
            onClick={reset}
            className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  )
}
