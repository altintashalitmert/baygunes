import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('pbms-auth')
  if (authData) {
    const { state } = JSON.parse(authData)
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`
    }
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pbms-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
