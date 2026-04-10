import { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { familyRepo } from '../repositories/family.repo.js';
import { generateToken } from '../auth/index.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { env } from '../config/index.js';

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const ALLOWED_RETURN_SCHEMES = ['omeubanco://', 'exp://'];

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

  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64url');

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

  let returnUrl = '';
  try {
    const stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    returnUrl = stateData.returnUrl ?? '';
  } catch {
    // ignore parse error
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

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return redirectToApp(c, returnUrl, { error: 'userinfo_failed' });
    }

    const googleUser = (await userRes.json()) as {
      email: string;
      name: string;
      picture: string;
    };

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

    // New user
    const family = await familyRepo.create({
      name: googleUser.name || 'Meu Banco',
      googleEmail: googleUser.email,
      googleName: googleUser.name || null,
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
    console.error('OAuth callback error:', err);
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

    // New user - create family
    const family = await familyRepo.create({
      name: fullName || 'Meu Banco',
      email: email,
      appleUserId,
      currency: 'BRL',
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
    });

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
    console.error('Apple Sign In callback error:', err);
    return c.json({ error: 'server_error' }, 500);
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

  // Fallback: show result on page
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Login completo</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8f8f5">
<div style="text-align:center;padding:20px">
<h2>Login realizado!</h2>
<p>Volte para o aplicativo.</p>
</div>
</body></html>`;
  return c.html(html);
}
