import api from './client'

export const poleApi = {
  // GET /api/poles
  getAll: (params) => api.get('/poles', { params }),

  // GET /api/poles/:id
  getById: (id) => api.get(`/poles/${id}`),

  // POST /api/poles
  create: (data) => api.post('/poles', data),

  // PATCH /api/poles/:id
  update: (id, data) => api.patch(`/poles/${id}`, data),

  // DELETE /api/poles/:id
  delete: (id) => api.delete(`/poles/${id}`),

  // GET /api/poles/available
  getAvailable: () => api.get('/poles/available'),

  // POST /api/poles/check-availability
  checkAvailability: (data) => api.post('/poles/check-availability', data),

  // PATCH /api/poles/bulk-update
  bulkUpdate: (poleIds, status) => api.patch('/poles/bulk-update', { poleIds, status }),

  // POST /api/poles/bulk-delete
  bulkDelete: (poleIds) => api.post('/poles/bulk-delete', { poleIds }),
  // POST /api/orders
  createOrder: (data) => api.post('/orders', data),
}
