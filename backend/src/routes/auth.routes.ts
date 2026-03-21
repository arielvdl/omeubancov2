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
import { db } from '../db/index.js';
import { guardians as guardiansTable } from '../db/schema/guardians.js';
import { familyInvitations } from '../db/schema/family-invitations.js';
import { eq, and } from 'drizzle-orm';

export const authRoutes = new Hono();

authRoutes.use('/*', authRateLimit);

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const data = registerSchema.parse(body);

  const existing = await familyRepo.findByEmail(data.email);
  if (existing) {
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
    });
  }

  // Try guardian
  const guardian = await guardianRepo.findByEmail(data.email);
  if (!guardian || guardian.status !== 'active') {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!guardian.passwordHash) {
    throw new AppError(401, 'Invalid credentials');
  }

  const valid = await comparePassword(data.password, guardian.passwordHash);
  if (!valid) {
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
  });

  await auditLogRepo.create({
    familyId: guardian.familyId,
    action: 'guardian.login',
    actor: `guardian:${guardian.id}`,
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
  });
});

authRoutes.post('/child-login', async (c) => {
  const body = await c.req.json();
  const data = childLoginSchema.parse(body);

  const child = await childRepo.findById(data.childId);
  if (!child) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!child.pinHash) {
    throw new AppError(401, 'PIN not set for this child');
  }

  const valid = await comparePassword(data.pin, child.pinHash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials');
  }

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
      client_id: data.clientId ?? '',
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

  // Check if returning guardian
  const existingGuardian = await guardianRepo.findByGoogleEmail(googleUser.email);
  if (existingGuardian && existingGuardian.status === 'active') {
    const guardianFamily = await familyRepo.findById(existingGuardian.familyId);
    if (guardianFamily) {
      const token = await generateToken({
        familyId: existingGuardian.familyId,
        role: 'parent',
        guardianId: existingGuardian.id,
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
      });
    }
  }

  // New user: create family with placeholder name
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

  const existingFamily = await familyRepo.findByEmail(data.email);
  if (existingFamily) {
    throw new AppError(409, 'Email already registered');
  }
  const existingGuardian = await guardianRepo.findByEmail(data.email);
  if (existingGuardian) {
    throw new AppError(409, 'Email already registered');
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
      .limit(1);

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
      client_id: data.clientId ?? '',
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

  const existingFamilyG = await familyRepo.findByGoogleEmail(googleUser.email);
  if (existingFamilyG) {
    throw new AppError(409, 'Google account already registered as family owner');
  }
  const existingGuardianG = await guardianRepo.findByGoogleEmail(googleUser.email);
  if (existingGuardianG) {
    throw new AppError(409, 'Google account already registered');
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
      .limit(1);

    if (!freshInvitation) {
      throw new AppError(409, 'Invitation already accepted or no longer available');
    }

    const [created] = await tx
      .insert(guardiansTable)
      .values({
        familyId: invitation.familyId,
        name: googleUser.name || data.roleLabel,
        roleLabel: data.roleLabel,
        googleEmail: googleUser.email,
        googleName: googleUser.name || null,
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
    },
    201
  );
});
