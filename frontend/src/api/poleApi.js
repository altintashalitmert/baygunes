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

  // GET /api/poles/staging
  getStaging: (params) => api.get('/poles/staging', { params }),

  // GET /api/poles/staging/groups
  getStagingGroups: (params) => api.get('/poles/staging/groups', { params }),

  // POST /api/poles/staging
  createStaging: (data) => api.post('/poles/staging', data),

  // POST /api/poles/reverse-geocode
  reverseGeocode: (data) => api.post('/poles/reverse-geocode', data),

  // POST /api/poles/staging/import
  importStaging: (ids) => api.post('/poles/staging/import', { ids }),

  // POST /api/poles/staging/delete
  deleteStaging: (ids) => api.post('/poles/staging/delete', { ids }),

  // POST /api/orders
  createOrder: (data) => api.post('/orders', data),
}
