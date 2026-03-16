import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

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
  return config;
});

// Response interceptor -- clears token on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  },
);
