
import api from './client'

export const notificationApi = {
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (id, data) => api.patch(`/notifications/settings/${id}`, data),
  testConnection: (data) => api.post('/notifications/test', data)
}
