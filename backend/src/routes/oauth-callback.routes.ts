import crypto from 'node:crypto';
import { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as Sentry from '@sentry/node';
import { familyRepo } from '../repositories/family.repo.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import { generateToken } from '../auth/index.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { env } from '../config/index.js';

// Postgres unique violation code (23505)
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

function uniqueConstraintName(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const e = err as { constraint?: string; constraint_name?: string };
  return e.constraint ?? e.constraint_name;
}

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const ALLOWED_RETURN_SCHEMES = ['omeubanco://', 'exp://'];

// State CSRF protection: stateValue = base64url(payload).hmacSha256
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function signState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyState(state: string): { returnUrl: string; ts: number } | null {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(data)
    .digest('base64url');
  // Timing-safe compare
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString()) as {
      returnUrl?: string;
      ts?: number;
    };
    if (typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > STATE_MAX_AGE_MS) return null;
    return { returnUrl: parsed.returnUrl ?? '', ts: parsed.ts };
  } catch {
    return null;
  }
}

// Defensive truncation for values coming from external IdPs (Google/Apple).
// DB schema relaxed google_photo/avatar_url to TEXT, but name/googleName
// still have hard limits — apply truncation in code to avoid 22001 errors.
const MAX_NAME = 100;
const MAX_GOOGLE_NAME = 255;
function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export const oauthCallbackRoutes = new Hono();

// Step 1: Start Google auth - app calls this to get the auth URL
oauthCallbackRoutes.get('/google/start', (c) => {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    return c.json({ error: 'Google OAuth not configured (missing GOOGLE_OAUTH_CLIENT_ID)' }, 500);
  }

  const returnUrl = c.req.query('returnUrl') ?? '';
  // Use the configured public URL so Google shows the custom domain
  // instead of the Cloud Run *.run.app hostname.
  const origin = env.PUBLIC_URL.replace(/\/+$/, '');
  const redirectUri = `${origin}/auth/google/callback`;

  const state = signState({ returnUrl, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  });

  return c.json({
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  });
});

// Step 2: Google redirects here after user consents
oauthCallbackRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state') ?? '';
  const error = c.req.query('error');

  // Verify state (HMAC + freshness). Reject if invalid/expired/tampered.
  const stateData = verifyState(stateParam);
  const returnUrl = stateData?.returnUrl ?? '';

  if (!stateData) {
    return redirectToApp(c, '', { error: 'invalid_state' });
  }

  if (error || !code) {
    return redirectToApp(c, returnUrl, { error: error ?? 'no_code' });
  }

  try {
    const origin = env.PUBLIC_URL.replace(/\/+$/, '');
    const redirectUri = `${origin}/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Google token exchange failed:', err);
      return redirectToApp(c, returnUrl, { error: 'token_exchange_failed' });
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      id_token?: string;
    };

    // Verify Google ID token cryptographically (preferred over userinfo trust)
    type GoogleIdClaims = {
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
      sub?: string;
    };
    let idClaims: GoogleIdClaims | null = null;

    if (tokenData.id_token) {
      try {
        const { payload } = await jwtVerify(tokenData.id_token, GOOGLE_JWKS, {
          issuer: GOOGLE_ISSUERS,
          audience: env.GOOGLE_OAUTH_CLIENT_ID,
        });
        idClaims = payload as unknown as GoogleIdClaims;
      } catch (err) {
        console.error('Google id_token verification failed:', err instanceof Error ? err.message : err);
        return redirectToApp(c, returnUrl, { error: 'invalid_id_token' });
      }
    }

    // Trust verified id_token claims when present; fall back to userinfo otherwise.
    let googleUser: { email: string; name: string; picture: string; emailVerified: boolean };
    if (idClaims?.email) {
      googleUser = {
        email: idClaims.email,
        name: idClaims.name ?? '',
        picture: idClaims.picture ?? '',
        emailVerified:
          idClaims.email_verified === true || idClaims.email_verified === 'true',
      };
    } else {
      const userRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userRes.ok) {
        return redirectToApp(c, returnUrl, { error: 'userinfo_failed' });
      }
      const u = (await userRes.json()) as {
        email: string;
        name: string;
        picture: string;
        verified_email?: boolean;
      };
      googleUser = {
        email: u.email,
        name: u.name,
        picture: u.picture,
        emailVerified: u.verified_email === true,
      };
    }

    if (!googleUser.email) {
      return redirectToApp(c, returnUrl, { error: 'no_email' });
    }

    // Find or create family
    const existingFamily = await familyRepo.findByGoogleEmail(googleUser.email);

    if (existingFamily) {
      const token = await generateToken({ familyId: existingFamily.id, role: 'parent' });

      await auditLogRepo.create({
        familyId: existingFamily.id,
        action: 'family.google_login',
        actor: 'parent',
      });

      return redirectToApp(c, returnUrl, {
        token,
        familyId: existingFamily.id,
        familyName: existingFamily.name,
        currency: existingFamily.currency,
        isNewUser: 'false',
      });
    }

    const [existingGuardian] = await guardianRepo.findAllActiveByGoogleEmail(googleUser.email);
    if (existingGuardian) {
      const guardianFamily = await familyRepo.findById(existingGuardian.familyId);
      if (guardianFamily) {
        const guardianAccessLevel =
          existingGuardian.accessLevel === 'admin' ? 'admin' : 'member';
        const token = await generateToken({
          familyId: existingGuardian.familyId,
          role: 'parent',
          guardianId: existingGuardian.id,
          guardianAccessLevel,
        });

        await auditLogRepo.create({
          familyId: existingGuardian.familyId,
          action: 'guardian.google_login',
          actor: `guardian:${existingGuardian.id}`,
        });

        return redirectToApp(c, returnUrl, {
          token,
          familyId: guardianFamily.id,
          familyName: guardianFamily.name,
          currency: guardianFamily.currency,
          isNewUser: 'false',
          guardianId: existingGuardian.id,
          roleLabel: existingGuardian.roleLabel,
          guardianAccessLevel,
        });
      }
    }

    // Same verified e-mail already registered via email/password: LINK the
    // Google account instead of creating a second, disconnected family.
    // Mirrors the Apple flow. Only with verified e-mail to prevent takeover
    // via unverified Google addresses.
    if (googleUser.emailVerified) {
      const familyByEmail = await familyRepo.findByEmail(googleUser.email);
      if (familyByEmail) {
        const linked = await familyRepo.linkGoogleAccount(familyByEmail.id, {
          googleEmail: googleUser.email,
          googleName: truncate(googleUser.name, MAX_GOOGLE_NAME),
          googlePhoto: googleUser.picture || null,
        });
        const familyToUse = linked ?? familyByEmail;
        const token = await generateToken({ familyId: familyToUse.id, role: 'parent' });

        await auditLogRepo.create({
          familyId: familyToUse.id,
          action: 'family.google_link',
          actor: 'parent',
          details: { email: googleUser.email },
        });

        return redirectToApp(c, returnUrl, {
          token,
          familyId: familyToUse.id,
          familyName: familyToUse.name,
          currency: familyToUse.currency,
          isNewUser: 'false',
        });
      }

      const guardianByEmail = await guardianRepo.findByEmail(googleUser.email);
      if (guardianByEmail && guardianByEmail.status === 'active') {
        const guardianFamilyByEmail = await familyRepo.findById(guardianByEmail.familyId);
        if (guardianFamilyByEmail) {
          await guardianRepo.linkGoogleAccount(guardianByEmail.id, {
            googleEmail: googleUser.email,
            googleName: truncate(googleUser.name, MAX_GOOGLE_NAME),
            googlePhoto: googleUser.picture || null,
          });

          const linkedAccessLevel =
            guardianByEmail.accessLevel === 'admin' ? 'admin' : 'member';
          const token = await generateToken({
            familyId: guardianByEmail.familyId,
            role: 'parent',
            guardianId: guardianByEmail.id,
            guardianAccessLevel: linkedAccessLevel,
          });

          await auditLogRepo.create({
            familyId: guardianByEmail.familyId,
            action: 'guardian.google_link',
            actor: `guardian:${guardianByEmail.id}`,
            details: { email: googleUser.email },
          });

          return redirectToApp(c, returnUrl, {
            token,
            familyId: guardianFamilyByEmail.id,
            familyName: guardianFamilyByEmail.name,
            currency: guardianFamilyByEmail.currency,
            isNewUser: 'false',
            guardianId: guardianByEmail.id,
            roleLabel: guardianByEmail.roleLabel,
            guardianAccessLevel: linkedAccessLevel,
          });
        }
      }
    }

    // New user
    const family = await familyRepo.create({
      name: truncate(googleUser.name, MAX_NAME) || 'Meu Banco',
      googleEmail: googleUser.email,
      googleName: truncate(googleUser.name, MAX_GOOGLE_NAME),
      googlePhoto: googleUser.picture || null,
      currency: 'BRL',
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
    });

    const token = await generateToken({ familyId: family.id, role: 'parent' });

    await auditLogRepo.create({
      familyId: family.id,
      action: 'family.google_register',
      actor: 'parent',
      details: { email: googleUser.email },
    });

    return redirectToApp(c, returnUrl, {
      token,
      familyId: family.id,
      familyName: family.name,
      currency: family.currency,
      isNewUser: 'true',
    });
  } catch (err) {
    // Log full payload size/lengths so future schema-overflow bugs are obvious
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string } | null)?.code;
    const constraint = uniqueConstraintName(err);
    console.error('OAuth callback error:', {
      message,
      code,
      constraint,
      stack: err instanceof Error ? err.stack : undefined,
    });
    Sentry.captureException(err, {
      tags: { route: 'google_callback', stage: 'outer_catch' },
      extra: { code, constraint },
    });
    return redirectToApp(c, returnUrl, { error: 'server_error' });
  }
});

// Apple Sign In - native flow callback
// Server-side verification of Apple identity token using Apple's JWKS
oauthCallbackRoutes.post('/apple/callback', async (c) => {
  try {
    const body = await c.req.json<{
      identityToken: string;
      fullName?: { givenName?: string; familyName?: string } | null;
      email?: string | null;
    }>();

    if (!body.identityToken) {
      return c.json({ error: 'missing_identity_token' }, 400);
    }

    // Cryptographically verify the Apple identity token against Apple's public keys
    let payload: { sub?: string; email?: string; email_verified?: boolean | string };
    try {
      const { payload: verified } = await jwtVerify(body.identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: env.APPLE_BUNDLE_ID || 'com.omeubanco-app',
      });
      payload = verified as typeof payload;
    } catch (err) {
      console.error('Apple token verification failed:', err instanceof Error ? err.message : err);
      return c.json({ error: 'invalid_identity_token' }, 401);
    }

    const appleUserId = payload.sub;
    if (!appleUserId) {
      return c.json({ error: 'missing_apple_user_id' }, 400);
    }

    // Apple only sends email/name on FIRST sign-in, so prefer body values then token values
    const email = body.email ?? payload.email ?? null;
    const fullName = body.fullName
      ? [body.fullName.givenName, body.fullName.familyName].filter(Boolean).join(' ')
      : null;

    // Find existing family by Apple user ID
    const existingFamily = await familyRepo.findByAppleUserId(appleUserId);

    if (existingFamily) {
      const token = await generateToken({ familyId: existingFamily.id, role: 'parent' });

      await auditLogRepo.create({
        familyId: existingFamily.id,
        action: 'family.apple_login',
        actor: 'parent',
      });

      return c.json({
        token,
        familyId: existingFamily.id,
        familyName: existingFamily.name,
        currency: existingFamily.currency,
        isNewUser: false,
      });
    }

    // Apple may not return email on subsequent sign-ins. If we have an email
    // and a family already exists with that email (from prior email/password
    // signup, for example), LINK the appleUserId instead of inserting a
    // duplicate row that would violate the families.email UNIQUE constraint.
    if (email) {
      const familyByEmail = await familyRepo.findByEmail(email);
      if (familyByEmail) {
        const linked = await familyRepo.linkAppleUserId(familyByEmail.id, appleUserId);
        const familyToUse = linked ?? familyByEmail;
        const token = await generateToken({ familyId: familyToUse.id, role: 'parent' });

        await auditLogRepo.create({
          familyId: familyToUse.id,
          action: 'family.apple_link',
          actor: 'parent',
          details: { appleUserId, email },
        });

        return c.json({
          token,
          familyId: familyToUse.id,
          familyName: familyToUse.name,
          currency: familyToUse.currency,
          isNewUser: false,
        });
      }
    }

    // New user - create family
    let family;
    try {
      family = await familyRepo.create({
        name: truncate(fullName, MAX_NAME) || 'Meu Banco',
        email: email,
        appleUserId,
        currency: 'BRL',
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
      });
    } catch (insertErr) {
      // Race condition: another request may have created the family between
      // findByAppleUserId/findByEmail and this insert. Re-query and reuse.
      if (isUniqueViolation(insertErr)) {
        const constraint = uniqueConstraintName(insertErr);
        Sentry.captureException(insertErr, {
          tags: { route: 'apple_callback', stage: 'family_insert' },
          extra: { constraint, hasEmail: !!email, appleUserId },
        });

        const retryByApple = await familyRepo.findByAppleUserId(appleUserId);
        if (retryByApple) {
          family = retryByApple;
        } else if (email) {
          const retryByEmail = await familyRepo.findByEmail(email);
          if (retryByEmail) {
            const linked = await familyRepo.linkAppleUserId(retryByEmail.id, appleUserId);
            family = linked ?? retryByEmail;
          }
        }
        if (!family) {
          return c.json(
            { error: 'account_conflict', constraint: constraint ?? 'unknown' },
            409
          );
        }
      } else {
        throw insertErr;
      }
    }

    const token = await generateToken({ familyId: family.id, role: 'parent' });

    await auditLogRepo.create({
      familyId: family.id,
      action: 'family.apple_register',
      actor: 'parent',
      details: { appleUserId, email },
    });

    return c.json({
      token,
      familyId: family.id,
      familyName: family.name,
      currency: family.currency,
      isNewUser: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string } | null)?.code;
    const constraint = uniqueConstraintName(err);
    console.error('Apple Sign In callback error:', {
      message,
      code,
      constraint,
      stack: err instanceof Error ? err.stack : undefined,
    });
    Sentry.captureException(err, {
      tags: { route: 'apple_callback', stage: 'outer_catch' },
      extra: { code, constraint },
    });
    return c.json({ error: 'server_error', code: code ?? null }, 500);
  }
});

function isAllowedReturnUrl(url: string): boolean {
  if (!url) return false;
  return ALLOWED_RETURN_SCHEMES.some((scheme) => url.startsWith(scheme));
}

function redirectToApp(
  c: any,
  returnUrl: string,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams(params);

  if (returnUrl && isAllowedReturnUrl(returnUrl)) {
    const separator = returnUrl.includes('?') ? '&' : '?';
    const targetUrl = `${returnUrl}${separator}${searchParams.toString()}`;

    // Use JS redirect instead of HTTP 302 for custom schemes (omeubanco://, exp://)
    // Safari iOS blocks 302 redirects to custom URL schemes
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecionando...</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8f8f5">
<div style="text-align:center;padding:20px">
<p>Redirecionando para o app...</p>
</div>
<script>window.location.href=${JSON.stringify(targetUrl)};</script>
</body></html>`;
    return c.html(html);
  }

  // Fallback page. If params carries an explicit error, surface it instead
  // of pretending login succeeded.
  const errorCode = params.error;
  const html = errorCode
    ? `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Erro no login</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8f8f5">
<div style="text-align:center;padding:20px;max-width:420px">
<h2 style="color:#b91c1c">Não foi possível concluir o login</h2>
<p>Tente novamente pelo app. Se persistir, entre em contato com o suporte.</p>
<p style="margin-top:16px;font-family:monospace;font-size:12px;color:#6b7280">code: ${errorCode.replace(/[^a-z_]/gi, '')}</p>
</div>
</body></html>`
    : `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Login completo</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8f8f5">
<div style="text-align:center;padding:20px">
<h2>Login realizado!</h2>
<p>Volte para o aplicativo.</p>
</div>
</body></html>`;
  return c.html(html);
}
