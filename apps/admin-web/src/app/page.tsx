'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🔧</div>
        <p className="text-lg font-semibold">Repara Lá Admin</p>
        <p className="text-blue-300 text-sm mt-2">Carregando...</p>
      </div>
    </div>
  )
}
