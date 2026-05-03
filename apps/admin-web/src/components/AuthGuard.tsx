'use client'

import { useEffect, useState } from 'react'
import { isAuthenticated } from '@/lib/auth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login'
    } else {
      setChecked(true)
    }
  }, [])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
