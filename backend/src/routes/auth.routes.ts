import { Hono } from 'hono';
import {
  registerSchema,
  loginSchema,
  childLoginSchema,
  googleAuthSchema,
  guardianRegisterSchema,
  guardianGoogleAuthSchema,
} from '../validators/index.js';
import { familyRepo } from '../repositories/family.repo.js';
import { childRepo } from '../repositories/child.repo.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import { familyInvitationRepo } from '../repositories/family-invitation.repo.js';
import { generateToken, hashPassword, comparePassword } from '../auth/index.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { authRateLimit } from '../middleware/rate-limit.js';
import { AppError } from '../middleware/error-handler.js';
import { notificationService } from '../services/notification.service.js';
import { membershipService } from '../services/membership.service.js';
import { env } from '../config/index.js';
import { db } from '../db/index.js';
import { guardians as guardiansTable } from '../db/schema/guardians.js';
import { familyInvitations } from '../db/schema/family-invitations.js';
import { eq, and } from 'drizzle-orm';

// Brute-force protection: track failed login attempts per childId
const childLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_CHILD_LOGIN_ATTEMPTS = 5;
const CHILD_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Defensive truncation for values coming from external IdPs.
const MAX_NAME = 100;
const MAX_GOOGLE_NAME = 255;
function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of childLoginAttempts) {
    if (entry.lockedUntil <= now && entry.count === 0) {
      childLoginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const authRoutes = new Hono();

authRoutes.use('/*', authRateLimit);

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const data = registerSchema.parse(body);

  const existing = await familyRepo.findByEmail(data.email);
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }
  // SEGURANÇA (cross-tenant): /auth/register NÃO prova posse do e-mail.
  // Se o e-mail já é guardian de alguma família, permitir criar uma família
  // dona com ele agruparia ambas em listFamilies() e daria acesso à família
  // alheia via /families/switch sem verificação. A entrada legítima em outra
  // família é só pelo fluxo de convite autenticado (POST /invitations/accept).
  const existingGuardian = await guardianRepo.findByEmail(data.email);
  if (existingGuardian) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(data.password);

  const family = await familyRepo.create({
    name: data.bankName,
    email: data.email,
    masterPasswordHash: passwordHash,
    currency: data.currency,
    locale: data.locale,
    timezone: data.timezone,
  });

  const token = await generateToken({ familyId: family.id, role: 'parent' });

  await auditLogRepo.create({
    familyId: family.id,
    action: 'family.register',
    actor: 'parent',
    details: { name: family.name },
  });

  return c.json(
    {
      family: {
        id: family.id,
        name: family.name,
        currency: family.currency,
        locale: family.locale,
        timezone: family.timezone,
        createdAt: family.createdAt,
      },
      token,
      isNewUser: true,
    },
    201
  );
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const data = loginSchema.parse(body);

  // Try family (owner) first
  const family = await familyRepo.findByEmail(data.email);
  if (family) {
    if (!family.masterPasswordHash) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await comparePassword(data.password, family.masterPasswordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = await generateToken({ familyId: family.id, role: 'parent' });

    await auditLogRepo.create({
      familyId: family.id,
      action: 'family.login',
      actor: 'parent',
    });

    const memberships = await membershipService.listFamilies({
      email: family.email,
      googleEmail: family.googleEmail,
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
      families: memberships,
    });
  }

  // Try guardian (multi-família: pode existir uma linha por família;
  // a senha vale para a identidade, então qualquer hash que bater serve)
  const guardianRows = await guardianRepo.findAllActiveByEmail(data.email);
  let guardian: (typeof guardianRows)[number] | undefined;
  for (const row of guardianRows) {
    if (row.passwordHash && (await comparePassword(data.password, row.passwordHash))) {
      guardian = row;
      break;
    }
  }
  if (!guardian) {
    throw new AppError(401, 'Invalid credentials');
  }

  const guardianFamily = await familyRepo.findById(guardian.familyId);
  if (!guardianFamily) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = await generateToken({
    familyId: guardian.familyId,
    role: 'parent',
    guardianId: guardian.id,
    guardianAccessLevel: guardian.accessLevel === 'admin' ? 'admin' : 'member',
  });

  await auditLogRepo.create({
    familyId: guardian.familyId,
    action: 'guardian.login',
    actor: `guardian:${guardian.id}`,
  });

  const memberships = await membershipService.listFamilies({
    email: guardian.email,
    googleEmail: guardian.googleEmail,
  });

  return c.json({
    family: {
      id: guardianFamily.id,
      name: guardianFamily.name,
      currency: guardianFamily.currency,
      locale: guardianFamily.locale,
      timezone: guardianFamily.timezone,
    },
    token,
    isNewUser: false,
    guardianId: guardian.id,
    roleLabel: guardian.roleLabel,
    guardianAccessLevel: guardian.accessLevel,
    families: memberships,
  });
});

authRoutes.post('/child-login', async (c) => {
  const body = await c.req.json();
  const data = childLoginSchema.parse(body);

  // Check brute-force lockout per childId
  const now = Date.now();
  const attempts = childLoginAttempts.get(data.childId);
  if (attempts && attempts.lockedUntil > now) {
    const retryAfter = Math.ceil((attempts.lockedUntil - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    throw new AppError(429, 'Too many failed attempts. Try again later.');
  }

  const child = await childRepo.findById(data.childId);
  if (!child) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!child.pinHash) {
    throw new AppError(401, 'PIN not set for this child');
  }

  const valid = await comparePassword(data.pin, child.pinHash);
  if (!valid) {
    // Track failed attempt
    const current = childLoginAttempts.get(data.childId) ?? { count: 0, lockedUntil: 0 };
    current.count++;
    if (current.count >= MAX_CHILD_LOGIN_ATTEMPTS) {
      current.lockedUntil = now + CHILD_LOCKOUT_MS;
      current.count = 0;
    }
    childLoginAttempts.set(data.childId, current);
    throw new AppError(401, 'Invalid credentials');
  }

  // Clear attempts on successful login
  childLoginAttempts.delete(data.childId);

  const token = await generateToken({
    familyId: child.familyId,
    role: 'child',
    childId: child.id,
  });

  await auditLogRepo.create({
    familyId: child.familyId,
    action: 'child.login',
    actor: `child:${child.id}`,
  });

  return c.json({
    child: {
      id: child.id,
      name: child.name,
      avatarUrl: child.avatarUrl,
      balance: child.balance,
    },
    token,
  });
});

authRoutes.post('/google', async (c) => {
  const body = await c.req.json();
  const data = googleAuthSchema.parse(body);

  // Exchange authorization code for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: data.code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: data.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: data.codeVerifier ?? '',
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error('Google token exchange failed:', err);
    throw new AppError(401, 'Failed to exchange Google authorization code');
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  // Get user info with the access token
  const googleResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!googleResponse.ok) {
    throw new AppError(401, 'Invalid Google access token');
  }

  const googleUser = (await googleResponse.json()) as {
    email: string;
    name: string;
    picture: string;
    verified_email?: boolean;
  };

  if (!googleUser.email) {
    throw new AppError(401, 'Google account has no email');
  }

  // Look up existing family by google_email
  const existingFamily = await familyRepo.findByGoogleEmail(googleUser.email);

  if (existingFamily) {
    // Returning user (owner)
    const token = await generateToken({ familyId: existingFamily.id, role: 'parent' });

    await auditLogRepo.create({
      familyId: existingFamily.id,
      action: 'family.google_login',
      actor: 'parent',
    });

    return c.json({
      family: {
        id: existingFamily.id,
        name: existingFamily.name,
        currency: existingFamily.currency,
        locale: existingFamily.locale,
        timezone: existingFamily.timezone,
        createdAt: existingFamily.createdAt,
      },
      token,
      isNewUser: false,
    });
  }

  // Check if returning guardian (multi-família: primeira linha ativa)
  const [existingGuardian] = await guardianRepo.findAllActiveByGoogleEmail(googleUser.email);
  if (existingGuardian) {
    const guardianFamily = await familyRepo.findById(existingGuardian.familyId);
    if (guardianFamily) {
      const token = await generateToken({
        familyId: existingGuardian.familyId,
        role: 'parent',
        guardianId: existingGuardian.id,
        guardianAccessLevel: existingGuardian.accessLevel === 'admin' ? 'admin' : 'member',
      });

      await auditLogRepo.create({
        familyId: existingGuardian.familyId,
        action: 'guardian.google_login',
        actor: `guardian:${existingGuardian.id}`,
      });

      return c.json({
        family: {
          id: guardianFamily.id,
          name: guardianFamily.name,
          currency: guardianFamily.currency,
          locale: guardianFamily.locale,
          timezone: guardianFamily.timezone,
          createdAt: guardianFamily.createdAt,
        },
        token,
        isNewUser: false,
        guardianId: existingGuardian.id,
        roleLabel: existingGuardian.roleLabel,
        guardianAccessLevel: existingGuardian.accessLevel,
      });
    }
  }

  // Same verified e-mail already registered via email/password: LINK the
  // Google account instead of creating a second, disconnected family.
  // Mirrors the Apple flow. Only with verified_email to prevent takeover
  // via unverified Google addresses.
  if (googleUser.verified_email === true) {
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

      return c.json({
        family: {
          id: familyToUse.id,
          name: familyToUse.name,
          currency: familyToUse.currency,
          locale: familyToUse.locale,
          timezone: familyToUse.timezone,
          createdAt: familyToUse.createdAt,
        },
        token,
        isNewUser: false,
      });
    }

    const guardianByEmail = await guardianRepo.findByEmail(googleUser.email);
    if (guardianByEmail && guardianByEmail.status === 'active') {
      const guardianFamily = await familyRepo.findById(guardianByEmail.familyId);
      if (guardianFamily) {
        await guardianRepo.linkGoogleAccount(guardianByEmail.id, {
          googleEmail: googleUser.email,
          googleName: truncate(googleUser.name, MAX_GOOGLE_NAME),
          googlePhoto: googleUser.picture || null,
        });

        const token = await generateToken({
          familyId: guardianByEmail.familyId,
          role: 'parent',
          guardianId: guardianByEmail.id,
          guardianAccessLevel: guardianByEmail.accessLevel === 'admin' ? 'admin' : 'member',
        });

        await auditLogRepo.create({
          familyId: guardianByEmail.familyId,
          action: 'guardian.google_link',
          actor: `guardian:${guardianByEmail.id}`,
          details: { email: googleUser.email },
        });

        return c.json({
          family: {
            id: guardianFamily.id,
            name: guardianFamily.name,
            currency: guardianFamily.currency,
            locale: guardianFamily.locale,
            timezone: guardianFamily.timezone,
            createdAt: guardianFamily.createdAt,
          },
          token,
          isNewUser: false,
          guardianId: guardianByEmail.id,
          roleLabel: guardianByEmail.roleLabel,
          guardianAccessLevel: guardianByEmail.accessLevel,
        });
      }
    }
  }

  // New user: create family with placeholder name
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

  return c.json(
    {
      family: {
        id: family.id,
        name: family.name,
        currency: family.currency,
        locale: family.locale,
        timezone: family.timezone,
        createdAt: family.createdAt,
      },
      token,
      isNewUser: true,
    },
    201
  );
});

// Guardian register via invite code
authRoutes.post('/guardian-register', async (c) => {
  const body = await c.req.json();
  const data = guardianRegisterSchema.parse(body);

  // Pre-validate invitation exists before expensive operations
  const invitation = await familyInvitationRepo.findByCode(data.inviteCode);
  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }
  if (invitation.status !== 'pending') {
    throw new AppError(400, `Invitation is ${invitation.status}`);
  }
  if (invitation.expiresAt < new Date()) {
    await familyInvitationRepo.updateStatus(invitation.id, 'expired');
    throw new AppError(400, 'Invitation has expired');
  }

  // E-mail já tem conta (dona ou guardian): orientar login + aceitar com a
  // conta existente (multi-família) em vez de criar credencial duplicada.
  const existingFamily = await familyRepo.findByEmail(data.email);
  const existingGuardian = existingFamily ? undefined : await guardianRepo.findByEmail(data.email);
  if (existingFamily || existingGuardian) {
    return c.json(
      {
        error: 'Email already registered',
        code: 'email_in_use',
      },
      409
    );
  }

  const passwordHash = await hashPassword(data.password);

  // Transaction: create guardian + accept invitation atomically
  // Re-check invitation status inside transaction to prevent race conditions
  const guardian = await db.transaction(async (tx) => {
    // Lock and verify invitation is still pending
    const [freshInvitation] = await tx
      .select()
      .from(familyInvitations)
      .where(
        and(
          eq(familyInvitations.id, invitation.id),
          eq(familyInvitations.status, 'pending')
        )
      )
      .limit(1)
      .for('update');

    if (!freshInvitation) {
      throw new AppError(409, 'Invitation already accepted or no longer available');
    }

    const [created] = await tx
      .insert(guardiansTable)
      .values({
        familyId: invitation.familyId,
        email: data.email,
        passwordHash,
        name: data.name,
        roleLabel: data.roleLabel,
        accessLevel: invitation.accessLevel,
        invitedBy: invitation.invitedBy,
      })
      .returning();

    await tx
      .update(familyInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByGuardianId: created.id,
      })
      .where(eq(familyInvitations.id, invitation.id));

    return created;
  });

  const invFamily = await familyRepo.findById(invitation.familyId);
  if (!invFamily) {
    throw new AppError(404, 'Family no longer exists');
  }

  const token = await generateToken({
    familyId: invitation.familyId,
    role: 'parent',
    guardianId: guardian.id,
    guardianAccessLevel: guardian.accessLevel === 'admin' ? 'admin' : 'member',
  });

  await auditLogRepo.create({
    familyId: invitation.familyId,
    action: 'guardian.register',
    actor: `guardian:${guardian.id}`,
    details: { name: guardian.name, roleLabel: guardian.roleLabel },
  });

  notificationService
    .sendToFamily(
      invitation.familyId,
      'Novo membro na família!',
      `${guardian.name} (${guardian.roleLabel}) aceitou o convite`,
      { type: 'invitation_accepted', guardianId: guardian.id }
    )
    .catch((err) => console.error('[Notification] invitation_accepted failed:', err));

  return c.json(
    {
      family: {
        id: invFamily.id,
        name: invFamily.name,
        currency: invFamily.currency,
        locale: invFamily.locale,
        timezone: invFamily.timezone,
      },
      token,
      isNewUser: false,
      guardianId: guardian.id,
      roleLabel: guardian.roleLabel,
      guardianAccessLevel: guardian.accessLevel,
    },
    201
  );
});

// Guardian Google OAuth via invite code
authRoutes.post('/guardian-google', async (c) => {
  const body = await c.req.json();
  const data = guardianGoogleAuthSchema.parse(body);

  const invitation = await familyInvitationRepo.findByCode(data.inviteCode);
  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }
  if (invitation.status !== 'pending') {
    throw new AppError(400, `Invitation is ${invitation.status}`);
  }
  if (invitation.expiresAt < new Date()) {
    await familyInvitationRepo.updateStatus(invitation.id, 'expired');
    throw new AppError(400, 'Invitation has expired');
  }

  const gTokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: data.code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: data.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: data.codeVerifier ?? '',
    }),
  });

  if (!gTokenResponse.ok) {
    throw new AppError(401, 'Failed to exchange Google authorization code');
  }

  const gTokenData = (await gTokenResponse.json()) as { access_token: string };

  const googleResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${gTokenData.access_token}` },
  });

  if (!googleResponse.ok) {
    throw new AppError(401, 'Invalid Google access token');
  }

  const googleUser = (await googleResponse.json()) as {
    email: string;
    name: string;
    picture: string;
  };

  if (!googleUser.email) {
    throw new AppError(401, 'Google account has no email');
  }

  // Conta Google já existe (dona ou guardian): orientar login + aceitar com
  // a conta existente (multi-família).
  const existingFamilyG = await familyRepo.findByGoogleEmail(googleUser.email);
  const existingGuardianG = existingFamilyG
    ? undefined
    : await guardianRepo.findByGoogleEmail(googleUser.email);
  if (existingFamilyG || existingGuardianG) {
    return c.json(
      {
        error: 'Google account already registered',
        code: 'email_in_use',
      },
      409
    );
  }

  // Transaction: create guardian + accept invitation atomically
  const guardian = await db.transaction(async (tx) => {
    // Re-check invitation status inside transaction to prevent race conditions
    const [freshInvitation] = await tx
      .select()
      .from(familyInvitations)
      .where(
        and(
          eq(familyInvitations.id, invitation.id),
          eq(familyInvitations.status, 'pending')
        )
      )
      .limit(1)
      .for('update');

    if (!freshInvitation) {
      throw new AppError(409, 'Invitation already accepted or no longer available');
    }

    const [created] = await tx
      .insert(guardiansTable)
      .values({
        familyId: invitation.familyId,
        name: truncate(googleUser.name, MAX_NAME) || data.roleLabel,
        roleLabel: data.roleLabel,
        accessLevel: invitation.accessLevel,
        googleEmail: googleUser.email,
        googleName: truncate(googleUser.name, MAX_GOOGLE_NAME),
        googlePhoto: googleUser.picture || null,
        invitedBy: invitation.invitedBy,
      })
      .returning();

    await tx
      .update(familyInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByGuardianId: created.id,
      })
      .where(eq(familyInvitations.id, invitation.id));

    return created;
  });

  const invFamily = await familyRepo.findById(invitation.familyId);
  if (!invFamily) {
    throw new AppError(404, 'Family no longer exists');
  }

  const token = await generateToken({
    familyId: invitation.familyId,
    role: 'parent',
    guardianId: guardian.id,
    guardianAccessLevel: guardian.accessLevel === 'admin' ? 'admin' : 'member',
  });

  await auditLogRepo.create({
    familyId: invitation.familyId,
    action: 'guardian.google_register',
    actor: `guardian:${guardian.id}`,
    details: { email: googleUser.email, roleLabel: data.roleLabel },
  });

  notificationService
    .sendToFamily(
      invitation.familyId,
      'Novo membro na família!',
      `${guardian.name} (${data.roleLabel}) aceitou o convite`,
      { type: 'invitation_accepted', guardianId: guardian.id }
    )
    .catch((err) => console.error('[Notification] invitation_accepted failed:', err));

  return c.json(
    {
      family: {
        id: invFamily.id,
        name: invFamily.name,
        currency: invFamily.currency,
        locale: invFamily.locale,
        timezone: invFamily.timezone,
      },
      token,
      isNewUser: false,
      guardianId: guardian.id,
      roleLabel: guardian.roleLabel,
      guardianAccessLevel: guardian.accessLevel,
    },
    201
  );
});
