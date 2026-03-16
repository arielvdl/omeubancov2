import { apiClient } from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  bankName: string;
  currency: string;
  locale: string;
  timezone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChildLoginPayload {
  childId: string;
  pin: string;
}

export interface AuthResponse {
  family: {
    id: string;
    name: string;
    currency: string;
    locale: string;
    timezone: string;
    createdAt?: string;
  };
  token: string;
  isNewUser: boolean;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  childLogin: (data: ChildLoginPayload) =>
    apiClient.post('/auth/child-login', data),
};
