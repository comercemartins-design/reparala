import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://reparala-api.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta token automaticamente em todas as requisições
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@reparala:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Trata erros globalmente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('@reparala:token')
      await AsyncStorage.removeItem('@reparala:user')
    }
    return Promise.reject(error)
  }
)

export default api
