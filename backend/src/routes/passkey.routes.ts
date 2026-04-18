import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, generateUserID } from '@simplewebauthn/server/helpers';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { passkeyRegisterVerifySchema, passkeyLoginVerifySchema } from '../validators/index.js';
import { passkeyRepo } from '../repositories/passkey.repo.js';
import { familyRepo } from '../repositories/family.repo.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { generateToken } from '../auth/index.js';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { authRateLimit } from '../middleware/rate-limit.js';
import { AppError } from '../middleware/error-handler.js';
import { env } from '../config/index.js';

export const passkeyRoutes = new Hono();

passkeyRoutes.use('/*', authRateLimit);

// -------------------------------------------------------------------
// POST /register-options  (authenticated parents only)
// -------------------------------------------------------------------
passkeyRoutes.post('/register-options', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const { familyId, guardianId } = user;

  // Resolve the user's email for the WebAuthn userName field
  let userName: string;
  if (guardianId) {
    const guardian = await guardianRepo.findById(guardianId);
    if (!guardian) {
      throw new AppError(404, 'Guardian not found');
    }
    userName = guardian.email ?? guardian.googleEmail ?? guardian.name;
  } else {
    const family = await familyRepo.findById(familyId);
    if (!family) {
      throw new AppError(404, 'Family not found');
    }
    userName = family.email ?? family.googleEmail ?? family.name;
  }

  // Existing passkeys for exclusion
  const existingPasskeys = await passkeyRepo.findByFamilyAndGuardian(familyId, guardianId);

  const excludeCredentials = existingPasskeys.map((pk) => ({
    id: pk.credentialId,
    transports: pk.transports
      ? (pk.transports.split(',') as AuthenticatorTransportFuture[])
      : undefined,
  }));

  // Generate a WebAuthn user ID
  const webauthnUserIdBytes = await generateUserID();
  const webauthnUserId = isoBase64URL.fromBuffer(webauthnUserIdBytes);

  const options = await generateRegistrationOptions({
    rpName: env.RP_NAME,
    rpID: env.RP_ID,
    userName,
    userID: webauthnUserIdBytes,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Sign the challenge into a short-lived JWT so we can verify it statelessly
  const now = Math.floor(Date.now() / 1000);
  const challengePayload: JWTPayload = {
    challenge: options.challenge,
    familyId,
    guardianId: guardianId ?? null,
    webauthnUserId,
    type: 'registration',
    iat: now,
    exp: now + 5 * 60, // 5 minutes
  };
  const challengeToken = await sign(challengePayload, env.JWT_SECRET);

  return c.json({ options, challengeToken });
});

// -------------------------------------------------------------------
// POST /register-verify  (authenticated parents only)
// -------------------------------------------------------------------
passkeyRoutes.post('/register-verify', authMiddleware, requireParent, async (c) => {
  const body = await c.req.json();
  const data = passkeyRegisterVerifySchema.parse(body);

  // Verify and decode the challenge token
  let challengeData: JWTPayload;
  try {
    challengeData = await verify(data.challengeToken, env.JWT_SECRET, 'HS256');
  } catch {
    throw new AppError(400, 'Invalid or expired challenge token');
  }

  if (challengeData.type !== 'registration') {
    throw new AppError(400, 'Invalid challenge token type');
  }

  const user = c.get('user');
  if (challengeData.familyId !== user.familyId) {
    throw new AppError(403, 'Challenge token does not match authenticated user');
  }

  const expectedOrigins = env.RP_ORIGIN.split(',').map((o: string) => o.trim());

  // Debug: decode clientDataJSON to see the real origin sent by the device
  try {
    const clientDataRaw = Buffer.from(data.credential.response.clientDataJSON, 'base64url').toString('utf-8');
    const clientData = JSON.parse(clientDataRaw);
    console.log('[Passkey Register] clientDataJSON origin:', clientData.origin);
    console.log('[Passkey Register] clientDataJSON type:', clientData.type);
    console.log('[Passkey Register] expectedOrigins:', expectedOrigins);
    console.log('[Passkey Register] expectedRPID:', env.RP_ID);
    console.log('[Passkey Register] credential.id:', data.credential.id);
  } catch (e) {
    console.warn('[Passkey Register] Could not decode clientDataJSON for debug:', e);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: data.credential,
      expectedChallenge: challengeData.challenge as string,
      expectedOrigin: expectedOrigins,
      expectedRPID: env.RP_ID,
    });
  } catch (verifyError: any) {
    console.error('[Passkey Register] verifyRegistrationResponse error:', verifyError?.message || verifyError);
    throw new AppError(400, `Passkey registration verification failed: ${verifyError?.message || 'unknown error'}`);
  }

  if (!verification.verified || !verification.registrationInfo) {
    console.error('[Passkey Register] Verification returned not verified');
    throw new AppError(400, 'Passkey registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Encode the public key bytes to base64 for storage
  const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64');

  // Extract transports from the credential response if available
  const transports = data.credential.response?.transports
    ? (data.credential.response.transports as string[]).join(',')
    : null;

  await passkeyRepo.create({
    familyId: user.familyId,
    guardianId: (challengeData.guardianId as string) ?? null,
    credentialId: credential.id,
    publicKey: publicKeyBase64,
    counter: credential.counter,
    transports,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    webauthnUserId: challengeData.webauthnUserId as string,
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'passkey.register',
    actor: user.guardianId ? `guardian:${user.guardianId}` : 'parent',
    details: { credentialId: credential.id, deviceType: credentialDeviceType },
  });

  return c.json({ verified: true });
});

// -------------------------------------------------------------------
// POST /login-options  (public, no auth required)
// -------------------------------------------------------------------
passkeyRoutes.post('/login-options', async (c) => {
  const options = await generateAuthenticationOptions({
    rpID: env.RP_ID,
    userVerification: 'preferred',
    allowCredentials: [], // discoverable credentials
  });

  const now = Math.floor(Date.now() / 1000);
  const challengePayload: JWTPayload = {
    challenge: options.challenge,
    type: 'authentication',
    iat: now,
    exp: now + 5 * 60,
  };
  const challengeToken = await sign(challengePayload, env.JWT_SECRET);

  return c.json({ options, challengeToken });
});

// -------------------------------------------------------------------
// POST /login-verify  (public, no auth required)
// -------------------------------------------------------------------
passkeyRoutes.post('/login-verify', async (c) => {
  const body = await c.req.json();
  const data = passkeyLoginVerifySchema.parse(body);

  // Verify the challenge token
  let challengeData: JWTPayload;
  try {
    challengeData = await verify(data.challengeToken, env.JWT_SECRET, 'HS256');
  } catch {
    throw new AppError(400, 'Invalid or expired challenge token');
  }

  if (challengeData.type !== 'authentication') {
    throw new AppError(400, 'Invalid challenge token type');
  }

  // Find the passkey by credential ID from the response
  const credentialIdFromResponse = data.credential.id as string;
  console.log('[Passkey Login] credentialId from response:', credentialIdFromResponse);

  const passkey = await passkeyRepo.findByCredentialId(credentialIdFromResponse);
  if (!passkey) {
    console.error('[Passkey Login] No passkey found for credentialId:', credentialIdFromResponse);
    throw new AppError(401, 'Invalid credentials');
  }

  // Reconstruct the public key as Uint8Array from stored base64
  const publicKeyBytes = new Uint8Array(Buffer.from(passkey.publicKey, 'base64'));

  const expectedOrigins = env.RP_ORIGIN.split(',').map((o: string) => o.trim());

  // Debug: decode clientDataJSON to see the real origin sent by the device
  try {
    const clientDataRaw = Buffer.from(data.credential.response.clientDataJSON, 'base64url').toString('utf-8');
    const clientData = JSON.parse(clientDataRaw);
    console.log('[Passkey Login] clientDataJSON origin:', clientData.origin);
    console.log('[Passkey Login] expectedOrigins:', expectedOrigins);
    console.log('[Passkey Login] expectedRPID:', env.RP_ID);
  } catch (e) {
    console.warn('[Passkey Login] Could not decode clientDataJSON for debug:', e);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: data.credential,
      expectedChallenge: challengeData.challenge as string,
      expectedOrigin: expectedOrigins,
      expectedRPID: [env.RP_ID],
      credential: {
        id: passkey.credentialId,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
        transports: passkey.transports
          ? (passkey.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch (verifyError: any) {
    console.error('[Passkey Login] verifyAuthenticationResponse error:', verifyError?.message || verifyError);
    throw new AppError(401, 'Invalid credentials');
  }

  if (!verification.verified) {
    console.error('[Passkey Login] Verification returned not verified');
    throw new AppError(401, 'Invalid credentials');
  }

  // Update counter to protect against replay attacks
  await passkeyRepo.updateCounter(passkey.id, verification.authenticationInfo.newCounter);

  // Look up the family
  const family = await familyRepo.findById(passkey.familyId);
  if (!family) {
    throw new AppError(401, 'Invalid credentials');
  }

  // Determine if this is a guardian or family owner login
  const isGuardian = !!passkey.guardianId;
  let guardianId: string | undefined;
  let roleLabel: string | undefined;
  let guardianAccessLevel: 'admin' | 'member' | undefined;

  if (isGuardian) {
    const guardian = await guardianRepo.findById(passkey.guardianId!);
    if (!guardian || guardian.status !== 'active') {
      throw new AppError(401, 'Access revoked');
    }
    guardianId = guardian.id;
    roleLabel = guardian.roleLabel;
    guardianAccessLevel = guardian.accessLevel === 'admin' ? 'admin' : 'member';
  }

  const token = await generateToken({
    familyId: family.id,
    role: 'parent',
    guardianId,
    guardianAccessLevel,
  });

  await auditLogRepo.create({
    familyId: family.id,
    action: isGuardian ? 'guardian.passkey_login' : 'family.passkey_login',
    actor: isGuardian ? `guardian:${guardianId}` : 'parent',
  });

  return c.json({
    family: {
      id: family.id,
      name: family.name,
      currency: family.currency,
      locale: family.locale,
      timezone: family.timezone,
    },
    token,
    isNewUser: false,
    ...(guardianId && { guardianId }),
    ...(roleLabel && { roleLabel }),
    ...(guardianAccessLevel && { guardianAccessLevel }),
  });
});
