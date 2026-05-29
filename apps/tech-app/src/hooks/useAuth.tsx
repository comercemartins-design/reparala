import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'
import api from '../services/api'

interface User {
  id: string
  name: string
  role: string
  technician?: any
}

interface AuthContextData {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStoredData() }, [])

  async function loadStoredData() {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        '@reparala-tech:token',
        '@reparala-tech:user',
      ])
      if (storedToken[1] && storedUser[1]) {
        setUser(JSON.parse(storedUser[1]))
      }
    } finally {
      setLoading(false)
    }
  }

  async function refreshUser() {
    try {
      const res = await api.get('/auth/me')
      const updated = res.data.data
      await AsyncStorage.setItem('@reparala-tech:user', JSON.stringify(updated))
      setUser(updated)
    } catch {}
  }

  async function signIn(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: newUser } = res.data.data

    if (newUser.role !== 'TECHNICIAN') {
      throw new Error('Acesso permitido somente para técnicos')
    }

    await AsyncStorage.multiSet([
      ['@reparala-tech:token', token],
      ['@reparala-tech:user', JSON.stringify(newUser)],
    ])
    setUser(newUser)
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['@reparala-tech:token', '@reparala-tech:user'])
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
