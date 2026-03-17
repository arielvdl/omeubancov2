import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from '@/src/utils/logger';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

logger.info('[API] Base URL:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor -- attaches token and locale to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locale = await SecureStore.getItemAsync('locale');
  if (locale) {
    config.headers['Accept-Language'] = locale;
  }
  // Let Axios set the correct Content-Type (with boundary) for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor -- clears token on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logger.warn('[API] 401 Unauthorized — clearing token');
      SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  },
);
