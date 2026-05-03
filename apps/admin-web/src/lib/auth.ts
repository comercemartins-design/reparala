'use client'

export interface AdminUser {
  id: string
  name: string
  role: string
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('@reparala-admin:user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('@reparala-admin:token')
}

export function storeAuth(token: string, user: AdminUser) {
  localStorage.setItem('@reparala-admin:token', token)
  localStorage.setItem('@reparala-admin:user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('@reparala-admin:token')
  localStorage.removeItem('@reparala-admin:user')
}

export function isAuthenticated(): boolean {
  return !!getStoredToken()
}
