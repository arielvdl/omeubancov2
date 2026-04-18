import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiClient } from './api/client';
import { logger } from '@/src/utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? '';

export interface GoogleAuthResult {
  token: string;
  familyId: string;
  familyName: string;
  currency: string;
  isNewUser: boolean;
  guardianId?: string;
  roleLabel?: string;
  guardianAccessLevel?: 'admin' | 'member';
  error?: string;
}

export async function startGoogleSignIn(): Promise<GoogleAuthResult | null> {
  // The return URL uses Expo's linking scheme so the browser redirects back to the app
  const returnUrl = Linking.createURL('auth/callback');
  console.log('[GoogleAuth] returnUrl:', returnUrl);
  console.log('[GoogleAuth] API_BASE:', API_BASE);

  logger.info('[GoogleAuth] Starting OAuth flow', { API_BASE });

  let data: any;
  try {
    const response = await apiClient.get('/auth/google/start', {
      params: { returnUrl },
      baseURL: API_BASE,
    });
    data = response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error || err?.message || 'Unknown error';
    const isNetworkError = !err?.response && (err?.code === 'ECONNABORTED' || err?.message?.includes('Network'));
    logger.error('[GoogleAuth] Failed to get auth URL', { status, message, isNetworkError, API_BASE });
    throw Object.assign(new Error(isNetworkError ? 'NETWORK_ERROR' : message), { status, isNetworkError });
  }

  const authUrl = data.authUrl as string;
  if (!authUrl) {
    console.error('[GoogleAuth] No authUrl in response:', data);
    throw new Error('No auth URL returned');
  }

  // Open browser - it will redirect back to the app when done
  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

  if (result.type !== 'success' || !result.url) {
    return null; // User cancelled
  }

  // Parse the result URL
  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};

  if (params.error) {
    throw new Error(String(params.error));
  }

  return {
    token: String(params.token ?? ''),
    familyId: String(params.familyId ?? ''),
    familyName: String(params.familyName ?? ''),
    currency: String(params.currency ?? 'BRL'),
    isNewUser: params.isNewUser === 'true',
    guardianId: params.guardianId ? String(params.guardianId) : undefined,
    roleLabel: params.roleLabel ? String(params.roleLabel) : undefined,
    guardianAccessLevel:
      params.guardianAccessLevel === 'admin' ? 'admin' : params.guardianAccessLevel === 'member' ? 'member' : undefined,
  };
}
