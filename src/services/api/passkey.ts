import { apiClient } from './client';

export interface PasskeyRegisterOptionsResponse {
  options: Record<string, unknown>;
  challengeToken: string;
}

export interface PasskeyVerifyRegistrationResponse {
  verified: boolean;
}

export interface PasskeyLoginOptionsResponse {
  options: Record<string, unknown>;
  challengeToken: string;
}

export interface PasskeyLoginVerifyResponse {
  family: {
    id: string;
    name: string;
    currency: string;
  };
  token: string;
  isNewUser: boolean;
  guardianId?: string;
  roleLabel?: string;
}

export const passkeyApi = {
  getRegisterOptions: () =>
    apiClient.post<PasskeyRegisterOptionsResponse>('/auth/passkey/register-options'),

  verifyRegistration: (data: { challengeToken: string; credential: unknown }) =>
    apiClient.post<PasskeyVerifyRegistrationResponse>('/auth/passkey/register-verify', data),

  getLoginOptions: () =>
    apiClient.post<PasskeyLoginOptionsResponse>('/auth/passkey/login-options'),

  verifyLogin: (data: { challengeToken: string; credential: unknown }) =>
    apiClient.post<PasskeyLoginVerifyResponse>('/auth/passkey/login-verify', data),
};
