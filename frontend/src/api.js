import axios from 'axios'

// Em produção, frontend e backend ficam no mesmo domínio
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const login = (username, password) => api.post('/auth/login/', { username, password })
export const logout = () => api.post('/auth/logout/')

export const getDashboard = () => api.get('/dashboard/')
export const getKitnets = (params) => api.get('/kitnets/', { params })
export const createKitnet = (data) => api.post('/kitnets/', data)
export const updateKitnet = (id, data) => api.patch(`/kitnets/${id}/`, data)
export const deleteKitnet = (id) => api.delete(`/kitnets/${id}/`)

export const getPagamentos = (params) => api.get('/pagamentos/', { params })
export const createPagamento = (data) => api.post('/pagamentos/', data)
export const updatePagamento = (id, data) => api.patch(`/pagamentos/${id}/`, data)

export const getInquilinos = (params) => api.get('/inquilinos/', { params })
export const createInquilino = (data) => api.post('/inquilinos/', data)
export const updateInquilino = (id, data) => api.patch(`/inquilinos/${id}/`, data)

export const getAlertas = (params) => api.get('/alertas/', { params })
export const marcarAlertaVisto = (id) => api.patch(`/alertas/${id}/`, { visualizado: true })
