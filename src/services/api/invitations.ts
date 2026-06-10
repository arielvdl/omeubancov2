import axios from 'axios';
import { apiClient } from './client';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Separate client for public endpoints (no auth token)
const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const invitationsApi = {
  // Invitations (authenticated)
  createInvitation: (accessLevel: 'admin' | 'member' = 'member') =>
    apiClient.post('/invitations', { accessLevel }),
  listInvitations: () => apiClient.get('/invitations'),
  revokeInvitation: (id: string) => apiClient.delete(`/invitations/${id}`),

  // Public
  getInvitationInfo: (inviteCode: string) =>
    publicClient.get(`/invitations/code/${inviteCode}`),

  // Accept invitation with existing account (authenticated)
  acceptInvitation: (inviteCode: string, roleLabel?: string) =>
    apiClient.post(`/invitations/accept/${inviteCode}`, roleLabel ? { roleLabel } : {}),

  // Multi-family (authenticated)
  getMemberships: () => apiClient.get('/families/memberships'),
  switchFamily: (familyId: string) => apiClient.post('/families/switch', { familyId }),

  // Guardians (authenticated)
  listGuardians: () => apiClient.get('/guardians'),
  removeGuardian: (id: string) => apiClient.delete(`/guardians/${id}`),

  // Guardian auth (public)
  guardianRegister: (data: {
    inviteCode: string;
    email: string;
    password: string;
    name: string;
    roleLabel: string;
  }) => publicClient.post('/auth/guardian-register', data),

  guardianGoogleAuth: (data: {
    inviteCode: string;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    clientId?: string;
    roleLabel: string;
  }) => publicClient.post('/auth/guardian-google', data),
};
