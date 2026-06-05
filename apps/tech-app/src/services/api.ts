import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { resetToLogin } from './navigationService'

const API_URL = 'https://reparala-api.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@reparala-tech:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['@reparala-tech:token', '@reparala-tech:user'])
      resetToLogin()
    }
    return Promise.reject(error)
  }
)

export default api
