
import api from './client'


// Account API
export const accountApi = {
  getAll: (params) => api.get('/accounts', { params }),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  
  // Transactions
  addTransaction: (data) => api.post('/transactions', data),
  getTransactions: (accountId) => api.get(`/transactions/account/${accountId}`),
}
