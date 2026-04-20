import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

// Inventory
export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  getOne: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust`, data),
}

// Customers
export const customersApi = {
  getAll: () => api.get('/customers'),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
}

// Sales
export const salesApi = {
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  verify: (id) => api.post(`/sales/${id}/verify`),
}

// Receivables
export const receivablesApi = {
  getAll: (params) => api.get('/receivables', { params }),
  getOne: (id) => api.get(`/receivables/${id}`),
  recordPayment: (id, data) => api.post(`/receivables/${id}/pay`, data),
}

// Receipts
export const receiptsApi = {
  getAll: (params) => api.get('/receipts', { params }),
  getOne: (id) => api.get(`/receipts/${id}`),
  resend: (id) => api.post(`/receipts/${id}/resend`),
  download: (id) => api.get(`/receipts/${id}/download`, { responseType: 'blob' }),
}

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
}

export default api
