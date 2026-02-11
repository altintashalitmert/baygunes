import api from './client'

export const orderApi = {
  // GET /api/orders - List orders with optional status filter
  getOrders: (params) => api.get('/orders', { params }),

  // PATCH /api/orders/:id/status - Update order status (transition)
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),

  // PATCH /api/orders/:id/assign-printer
  assignPrinter: (id, printerId) => api.patch(`/orders/${id}/assign-printer`, { printerId }),

  // PATCH /api/orders/:id/assign-field
  assignField: (id, fieldId) => api.patch(`/orders/${id}/assign-field`, { fieldId }),

  // GET /api/orders/my-tasks
  getMyTasks: () => api.get('/orders/my-tasks'),

  // POST /api/orders/:id/upload/:type - Upload design image or contract
  uploadFile: (id, type, formData) => api.post(`/orders/${id}/upload/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // GET /api/orders/:id - Get single order details
  getById: (id) => api.get(`/orders/${id}`),


  // POST /api/orders - Create new order
  createOrder: (data) => api.post('/orders', data),
  
  // Download PDF
  downloadPdf: async (id) => {
    const response = await api.get(`/orders/${id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `siparis_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}
