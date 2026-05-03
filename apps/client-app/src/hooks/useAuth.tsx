import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../services/api'

interface User {
  id: string
  name: string
  role: string
  client?: any
}

interface AuthContextData {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface SignUpData {
  name: string
  email: string
  password: string
  phone?: string
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
        '@reparala:token',
        '@reparala:user',
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
      await AsyncStorage.setItem('@reparala:user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
    }
  }

  async function signIn(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, user: newUser } = response.data.data

    await AsyncStorage.multiSet([
      ['@reparala:token', newToken],
      ['@reparala:user', JSON.stringify(newUser)],
    ])

    setToken(newToken)
    setUser(newUser)
  }

  async function signUp(data: SignUpData) {
    const response = await api.post('/auth/register', { ...data, role: 'CLIENT' })
    const { token: newToken, user: newUser } = response.data.data

    await AsyncStorage.multiSet([
      ['@reparala:token', newToken],
      ['@reparala:user', JSON.stringify(newUser)],
    ])

    setToken(newToken)
    setUser(newUser)
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['@reparala:token', '@reparala:user'])
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}