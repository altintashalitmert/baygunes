import api from './client'

export const pricingApi = {
  // Get pricing config
  getPricing: async () => api.get('/pricing'),

  // Update pricing config
  updatePricing: async (data) => api.put('/pricing', data),
}
