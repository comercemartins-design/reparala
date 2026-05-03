'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearAuth, getStoredUser } from '@/lib/auth'

const NAV_ITEMS = [
  { href: '/dashboard',              icon: '📊', label: 'Visão Geral' },
  { href: '/dashboard/orders',       icon: '📋', label: 'Chamados' },
  { href: '/dashboard/technicians',  icon: '👷', label: 'Técnicos' },
  { href: '/dashboard/clients',      icon: '👥', label: 'Clientes' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = getStoredUser()

  function handleSignOut() {
    clearAuth()
    router.replace('/login')
  }

  return (
    <aside className="w-64 bg-brand-800 min-h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-brand-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔧</span>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Repara Lá</p>
            <p className="text-blue-300 text-xs">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                active
                  ? 'bg-white text-brand-800'
                  : 'text-blue-200 hover:bg-brand-700 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-brand-700">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-blue-300 text-xs">Administrador</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2 text-sm text-blue-300 hover:text-white hover:bg-brand-700 rounded-lg transition"
        >
          Sair →
        </button>
      </div>
    </aside>
  )
}
