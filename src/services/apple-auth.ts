import * as AppleAuthentication from 'expo-apple-authentication';
import axios from 'axios';
import { logger } from '@/src/utils/logger';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? '';

export interface AppleAuthResult {
  token: string;
  familyId: string;
  familyName: string;
  currency: string;
  isNewUser: boolean;
  guardianId?: string;
  roleLabel?: string;
  guardianAccessLevel?: 'admin' | 'member';
}

export async function startAppleSignIn(): Promise<AppleAuthResult | null> {
  logger.info('[AppleAuth] Starting Apple Sign In', { API_BASE });

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === 'ERR_REQUEST_UNKNOWN') {
      logger.warn('[AppleAuth] signInAsync dismissed', { code: error?.code });
      return null;
    }
    logger.error('[AppleAuth] signInAsync failed', { code: error?.code, message: error?.message });
    throw error;
  }

  const identityToken = credential.identityToken;
  if (!identityToken) {
    throw new Error('No identity token returned from Apple');
  }

  try {
    const response = await axios.post(`${API_BASE}/auth/apple/callback`, {
      identityToken,
      fullName: credential.fullName ? {
        givenName: credential.fullName.givenName ?? undefined,
        familyName: credential.fullName.familyName ?? undefined,
      } : undefined,
      email: credential.email ?? undefined,
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    const data = response.data;

    return {
      token: String(data.token ?? ''),
      familyId: String(data.familyId ?? ''),
      familyName: String(data.familyName ?? ''),
      currency: String(data.currency ?? 'BRL'),
      isNewUser: data.isNewUser === true,
      guardianId: data.guardianId ? String(data.guardianId) : undefined,
      roleLabel: data.roleLabel ? String(data.roleLabel) : undefined,
      guardianAccessLevel:
        data.guardianAccessLevel === 'admin' ? 'admin' : data.guardianAccessLevel === 'member' ? 'member' : undefined,
    };
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error || err?.message || 'Unknown error';
    const isNetworkError = !err?.response && (err?.code === 'ECONNABORTED' || err?.message?.includes('Network'));
    logger.error('[AppleAuth] Backend callback failed', { status, message, isNetworkError, API_BASE });
    throw Object.assign(new Error(isNetworkError ? 'NETWORK_ERROR' : message), { status, isNetworkError });
  }
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}
