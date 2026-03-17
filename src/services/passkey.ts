import { Passkey } from 'react-native-passkey';
import type { PasskeyCreateRequest, PasskeyGetRequest } from 'react-native-passkey/lib/typescript/PasskeyTypes';
import { passkeyApi } from './api/passkey';
import { logger } from '../utils/logger';

/**
 * Convert base64 standard to base64url if needed.
 * iOS react-native-passkey v3 already returns base64url, but this ensures
 * compatibility regardless of platform/version.
 */
function toBase64url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Normalize the create result from react-native-passkey to ensure
 * all fields are base64url encoded as expected by @simplewebauthn/server.
 */
function normalizeCreateResult(result: Record<string, any>): Record<string, any> {
  return {
    ...result,
    id: toBase64url(result.id),
    rawId: toBase64url(result.rawId),
    type: result.type ?? 'public-key',
    response: {
      ...result.response,
      clientDataJSON: toBase64url(result.response.clientDataJSON),
      attestationObject: toBase64url(result.response.attestationObject),
    },
  };
}

/**
 * Normalize the get result from react-native-passkey to ensure
 * all fields are base64url encoded as expected by @simplewebauthn/server.
 */
function normalizeGetResult(result: Record<string, any>): Record<string, any> {
  return {
    ...result,
    id: toBase64url(result.id),
    rawId: toBase64url(result.rawId),
    type: result.type ?? 'public-key',
    response: {
      ...result.response,
      clientDataJSON: toBase64url(result.response.clientDataJSON),
      authenticatorData: toBase64url(result.response.authenticatorData),
      signature: toBase64url(result.response.signature),
      userHandle: result.response.userHandle ? toBase64url(result.response.userHandle) : undefined,
    },
  };
}

export async function registerPasskey(): Promise<boolean> {
  logger.info('[Passkey] Starting registration...');

  // Step 1: Get options from server
  let options: Record<string, any>;
  let challengeToken: string;
  try {
    const { data } = await passkeyApi.getRegisterOptions();
    options = data.options as Record<string, any>;
    challengeToken = data.challengeToken;
    logger.info('[Passkey] Got register options from server', {
      rpId: options.rp?.id,
      rpName: options.rp?.name,
      userName: options.user?.name,
    });
  } catch (error: any) {
    logger.error('[Passkey] Failed to get register options', error?.message || error);
    throw error;
  }

  // Step 2: Create passkey via native API
  let result: Record<string, any>;
  try {
    result = await Passkey.create(options as unknown as PasskeyCreateRequest);
    logger.info('[Passkey] Passkey.create() succeeded', {
      id: result.id?.substring(0, 20) + '...',
      type: result.type,
      hasAttestationObject: !!result.response?.attestationObject,
      hasClientDataJSON: !!result.response?.clientDataJSON,
      transports: result.response?.transports,
    });
  } catch (error: any) {
    logger.error('[Passkey] Passkey.create() failed', {
      error: error?.error || error?.message || error,
      message: error?.message,
    });
    throw error;
  }

  // Step 3: Normalize and send to server for verification
  const normalizedResult = normalizeCreateResult(result);
  logger.info('[Passkey] Sending normalized credential to server for verification');

  try {
    const verification = await passkeyApi.verifyRegistration({
      challengeToken,
      credential: normalizedResult,
    });
    logger.info('[Passkey] Server verification result:', { verified: verification.data.verified });
    return verification.data.verified;
  } catch (error: any) {
    logger.error('[Passkey] Server verification failed', {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message || error,
    });
    throw error;
  }
}

export async function loginWithPasskey(): Promise<{
  token: string;
  familyId: string;
  familyName: string;
  currency: string;
  isNewUser: boolean;
  guardianId?: string;
  roleLabel?: string;
} | null> {
  logger.info('[Passkey] Starting login...');

  // Step 1: Get options from server
  let options: Record<string, any>;
  let challengeToken: string;
  try {
    const { data } = await passkeyApi.getLoginOptions();
    options = data.options as Record<string, any>;
    challengeToken = data.challengeToken;
    logger.info('[Passkey] Got login options from server', { rpId: options.rpId });
  } catch (error: any) {
    logger.error('[Passkey] Failed to get login options', error?.message || error);
    throw error;
  }

  // Step 2: Get passkey via native API
  let result: Record<string, any>;
  try {
    result = await Passkey.get(options as unknown as PasskeyGetRequest);
    logger.info('[Passkey] Passkey.get() succeeded', {
      id: result.id?.substring(0, 20) + '...',
      type: result.type,
      hasSignature: !!result.response?.signature,
      hasUserHandle: !!result.response?.userHandle,
    });
  } catch (error: any) {
    logger.error('[Passkey] Passkey.get() failed', {
      error: error?.error || error?.message || error,
      message: error?.message,
    });
    throw error;
  }

  // Step 3: Normalize and send to server for verification
  const normalizedResult = normalizeGetResult(result);
  logger.info('[Passkey] Sending normalized credential to server for verification');

  try {
    const verification = await passkeyApi.verifyLogin({
      challengeToken,
      credential: normalizedResult,
    });

    const response = verification.data;
    logger.info('[Passkey] Login verification succeeded');
    return {
      token: response.token,
      familyId: response.family.id,
      familyName: response.family.name,
      currency: response.family.currency,
      isNewUser: response.isNewUser,
      guardianId: response.guardianId,
      roleLabel: response.roleLabel,
    };
  } catch (error: any) {
    logger.error('[Passkey] Login verification failed', {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message || error,
    });
    throw error;
  }
}

export async function isPasskeySupported(): Promise<boolean> {
  try {
    return Passkey.isSupported();
  } catch {
    return false;
  }
}

/**
 * Identify the type of passkey error for user-facing messages.
 */
export function getPasskeyErrorType(error: any): 'cancelled' | 'no_credentials' | 'not_supported' | 'server' | 'unknown' {
  const errorCode = error?.error;
  const message = (error?.message || '').toLowerCase();

  if (errorCode === 'UserCancelled' || message.includes('cancel')) {
    return 'cancelled';
  }
  if (errorCode === 'NoCredentials' || message.includes('no credential')) {
    return 'no_credentials';
  }
  if (errorCode === 'NotSupported' || message.includes('not supported')) {
    return 'not_supported';
  }
  if (error?.response?.status) {
    return 'server';
  }
  return 'unknown';
}
