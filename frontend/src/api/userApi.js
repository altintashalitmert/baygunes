import api from './client'

export const userApi = {
  // GET /api/users
  getAll: () => api.get('/users'),

  // GET /api/users/printers
  getPrinters: () => api.get('/users/printers'),

  // GET /api/users/field-teams
  getFieldTeams: () => api.get('/users/field-teams'),

  // GET /api/users/:id
  getById: (id) => api.get(`/users/${id}`),

  // POST /api/users
  create: (data) => api.post('/users', data),

  // PATCH /api/users/:id
  update: (id, data) => api.patch(`/users/${id}`, data),

  // PATCH /api/users/:id/password
  changePassword: (id, password) => api.patch(`/users/${id}/password`, { password }),

  // DELETE /api/users/:id
  delete: (id) => api.delete(`/users/${id}`),
}
