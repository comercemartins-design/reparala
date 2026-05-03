import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../services/api'

interface Technician {
  id: string
  status: string
  city: string
  specialties: string[]
  rating: number
  jobsTotal: number
  jobsToday: number
}

interface User {
  id: string
  name: string
  role: string
  technician?: Technician
}

interface AuthContextData {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStoredData()
  }, [])

  async function loadStoredData() {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        '@reparala-tech:token',
        '@reparala-tech:user',
      ])
      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1])
        setUser(JSON.parse(storedUser[1]))
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function refreshUser() {
    try {
      const response = await api.get('/auth/me')
      const updatedUser = response.data.data
      await AsyncStorage.setItem('@reparala-tech:user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
    }
  }

  async function signIn(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, user: newUser } = response.data.data

    if (newUser.role !== 'TECHNICIAN') {
      throw new Error('Acesso permitido apenas para técnicos')
    }

    await AsyncStorage.multiSet([
      ['@reparala-tech:token', newToken],
      ['@reparala-tech:user', JSON.stringify(newUser)],
    ])

    setToken(newToken)
    setUser(newUser)
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['@reparala-tech:token', '@reparala-tech:user'])
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
