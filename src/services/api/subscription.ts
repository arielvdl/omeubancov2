import { apiClient } from './client';

export const subscriptionApi = {
  getSubscription() {
    return apiClient.get('/subscription');
  },
  getLimits() {
    return apiClient.get('/subscription/limits');
  },
};
