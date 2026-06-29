import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { resetToLogin } from './navigationService'

const API_URL = 'https://reparala-api.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 35000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@reparala:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['@reparala:token', '@reparala:user'])
      resetToLogin()
    }
    return Promise.reject(error)
  }
)

export default api
