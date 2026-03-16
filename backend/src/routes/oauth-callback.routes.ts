import { Hono } from 'hono';
import { familyRepo } from '../repositories/family.repo.js';
import { generateToken } from '../auth/index.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '';

export const oauthCallbackRoutes = new Hono();

// Step 1: Start Google auth - app calls this to get the auth URL
oauthCallbackRoutes.get('/google/start', (c) => {
  const returnUrl = c.req.query('returnUrl') ?? '';
  const origin = new URL(c.req.url).origin.replace('http://', 'https://');
  const redirectUri = `${origin}/auth/google/callback`;

  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64url');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
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
    const backendUrl = new URL(c.req.url).origin;
    const redirectUri = `${backendUrl}/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
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

function redirectToApp(
  c: any,
  returnUrl: string,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams(params);

  if (returnUrl) {
    const separator = returnUrl.includes('?') ? '&' : '?';
    return c.redirect(`${returnUrl}${separator}${searchParams.toString()}`);
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
