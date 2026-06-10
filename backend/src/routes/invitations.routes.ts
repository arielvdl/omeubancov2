import crypto from 'node:crypto';
import { Hono } from 'hono';
import { authMiddleware, requireParent, requireFamilyAdmin } from '../auth/guards.js';
import { familyInvitationRepo } from '../repositories/family-invitation.repo.js';
import { familyRepo } from '../repositories/family.repo.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { inviteInfoRateLimit, invitationRateLimit } from '../middleware/rate-limit.js';
import { AppError } from '../middleware/error-handler.js';
import { createInvitationSchema, inviteCodeParamSchema } from '../validators/index.js';

export const invitationsRoutes = new Hono();

function generateInviteCode(): string {
  return crypto.randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
}

async function createInviteWithRetry(data: {
  familyId: string;
  invitedBy: string;
  accessLevel: 'admin' | 'member';
  expiresAt: Date;
}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await familyInvitationRepo.create({
        ...data,
        inviteCode: generateInviteCode(),
      });
    } catch (err: any) {
      const isUniqueViolation =
        err?.code === '23505' || err?.message?.includes('unique');
      if (!isUniqueViolation || attempt === maxRetries - 1) throw err;
    }
  }
  throw new AppError(500, 'Failed to generate unique invite code');
}

// Create invitation (family admin only)
invitationsRoutes.post('/', authMiddleware, requireFamilyAdmin, invitationRateLimit, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const data = createInvitationSchema.parse(body);

  // Subscription gating: check guardian invite
  const { subscriptionService } = await import('../services/subscription.service.js');
  const canInvite = await subscriptionService.checkGuardianInviteAllowed(user.familyId);
  if (!canInvite) {
    return c.json({
      error: 'subscription_required',
      feature: 'invite_guardian',
    }, 403);
  }

  const pendingCount = await familyInvitationRepo.countActivePending(user.familyId);
  if (pendingCount >= 10) {
    throw new AppError(429, 'Too many pending invitations');
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  const invitation = await createInviteWithRetry({
    familyId: user.familyId,
    invitedBy: user.familyId,
    accessLevel: data.accessLevel,
    expiresAt,
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'invitation.create',
    actor: 'parent',
    details: { inviteCode: invitation.inviteCode },
  });

  return c.json({
    invitation: {
      id: invitation.id,
      inviteCode: invitation.inviteCode,
      accessLevel: invitation.accessLevel,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      deepLink: `https://omeubanco.xyz/invite/${invitation.inviteCode}`,
    },
  }, 201);
});

// List invitations (family admin only)
invitationsRoutes.get('/', authMiddleware, requireFamilyAdmin, async (c) => {
  const user = c.get('user');
  const invitations = await familyInvitationRepo.findByFamilyId(user.familyId);

  return c.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      inviteCode: inv.inviteCode,
      accessLevel: inv.accessLevel,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      deepLink: `https://omeubanco.xyz/invite/${inv.inviteCode}`,
    })),
  });
});

// Revoke invitation (family admin only)
invitationsRoutes.delete('/:id', authMiddleware, requireFamilyAdmin, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const invitation = await familyInvitationRepo.findById(id);
  if (!invitation || invitation.familyId !== user.familyId) {
    throw new AppError(404, 'Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new AppError(400, 'Only pending invitations can be revoked');
  }

  await familyInvitationRepo.updateStatus(id, 'revoked');

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'invitation.revoke',
    actor: 'parent',
    details: { inviteCode: invitation.inviteCode },
  });

  return c.json({ message: 'Invitation revoked' });
});

// Accept invitation (authenticated user - link existing account to family)
invitationsRoutes.post('/accept/:inviteCode', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const { inviteCode } = c.req.param();
  const parsed = inviteCodeParamSchema.safeParse({ inviteCode });
  if (!parsed.success) {
    throw new AppError(400, 'Invalid invite code');
  }

  const invitation = await familyInvitationRepo.findByCode(parsed.data.inviteCode);
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

  // If user is already a member of this family, no-op success.
  // The invite stays pending so the intended recipient can still use it.
  if (user.familyId === invitation.familyId) {
    return c.json({ message: 'Already a member of this family', alreadyMember: true });
  }

  // Multi-família: usuário existente (dono ou guardian de outra família)
  // entra na família do convite como guardian, mantendo a conta atual.
  const { membershipService } = await import('../services/membership.service.js');
  const { guardianRepo } = await import('../repositories/guardian.repo.js');
  const { generateToken } = await import('../auth/index.js');
  const { db } = await import('../db/index.js');
  const { guardians: guardiansTable } = await import('../db/schema/guardians.js');
  const { familyInvitations } = await import('../db/schema/family-invitations.js');
  const { and, eq } = await import('drizzle-orm');

  const identity = await membershipService.getIdentityForUser(user);
  if (!identity) {
    throw new AppError(401, 'Invalid or expired token');
  }

  const targetFamily = await familyRepo.findById(invitation.familyId);
  if (!targetFamily) {
    throw new AppError(404, 'Family no longer exists');
  }

  // Já é dona ou guardian ativa da família-alvo? Devolver token de troca
  // sem consumir o convite.
  const ownsTarget =
    (identity.email && targetFamily.email === identity.email) ||
    (identity.googleEmail && targetFamily.googleEmail === identity.googleEmail);
  if (ownsTarget) {
    const token = await generateToken({ familyId: targetFamily.id, role: 'parent' });
    return c.json({
      message: 'Already the owner of this family',
      alreadyMember: true,
      token,
      family: {
        id: targetFamily.id,
        name: targetFamily.name,
        currency: targetFamily.currency,
        locale: targetFamily.locale,
        timezone: targetFamily.timezone,
      },
    });
  }

  const existingInTarget =
    (identity.email &&
      (await guardianRepo.findActiveByFamilyAndEmail(invitation.familyId, identity.email))) ||
    (identity.googleEmail &&
      (await guardianRepo.findActiveByFamilyAndGoogleEmail(
        invitation.familyId,
        identity.googleEmail
      ))) ||
    undefined;
  if (existingInTarget) {
    const token = await generateToken({
      familyId: invitation.familyId,
      role: 'parent',
      guardianId: existingInTarget.id,
      guardianAccessLevel: existingInTarget.accessLevel === 'admin' ? 'admin' : 'member',
    });
    return c.json({
      message: 'Already a member of this family',
      alreadyMember: true,
      token,
      family: {
        id: targetFamily.id,
        name: targetFamily.name,
        currency: targetFamily.currency,
        locale: targetFamily.locale,
        timezone: targetFamily.timezone,
      },
      guardianId: existingInTarget.id,
      roleLabel: existingInTarget.roleLabel,
      guardianAccessLevel: existingInTarget.accessLevel,
    });
  }

  const body = await c.req.json().catch(() => ({}));
  const roleLabelRaw = typeof body?.roleLabel === 'string' ? body.roleLabel.trim() : '';
  const roleLabel = (roleLabelRaw || 'Responsável').slice(0, 50);

  // Transação com lock: consumir o convite e criar o guardian atomicamente.
  const guardian = await db.transaction(async (tx) => {
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
        email: identity.email,
        googleEmail: identity.googleEmail,
        googleName: identity.googleName,
        googlePhoto: identity.googlePhoto,
        passwordHash: identity.passwordHash,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
        roleLabel,
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

  const token = await generateToken({
    familyId: invitation.familyId,
    role: 'parent',
    guardianId: guardian.id,
    guardianAccessLevel: guardian.accessLevel === 'admin' ? 'admin' : 'member',
  });

  await auditLogRepo.create({
    familyId: invitation.familyId,
    action: 'guardian.join_existing_account',
    actor: `guardian:${guardian.id}`,
    details: { name: guardian.name, roleLabel: guardian.roleLabel },
  });

  const { notificationService } = await import('../services/notification.service.js');
  notificationService
    .sendToFamily(
      invitation.familyId,
      'Novo membro na família!',
      `${guardian.name} (${guardian.roleLabel}) aceitou o convite`,
      { type: 'invitation_accepted', guardianId: guardian.id }
    )
    .catch((err) => console.error('[Notification] invitation_accepted failed:', err));

  return c.json({
    joined: true,
    family: {
      id: targetFamily.id,
      name: targetFamily.name,
      currency: targetFamily.currency,
      locale: targetFamily.locale,
      timezone: targetFamily.timezone,
    },
    token,
    guardianId: guardian.id,
    roleLabel: guardian.roleLabel,
    guardianAccessLevel: guardian.accessLevel,
  });
});

// Public: get invitation info by code
invitationsRoutes.get('/code/:inviteCode', inviteInfoRateLimit, async (c) => {
  const { inviteCode } = c.req.param();
  const parsed = inviteCodeParamSchema.safeParse({ inviteCode });
  if (!parsed.success) {
    throw new AppError(400, 'Invalid invite code');
  }

  const invitation = await familyInvitationRepo.findByCode(parsed.data.inviteCode);
  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }

  // Check expiration
  const now = new Date();
  if (invitation.status === 'pending' && invitation.expiresAt < now) {
    await familyInvitationRepo.updateStatus(invitation.id, 'expired');
    return c.json({
      status: 'expired',
      familyName: null,
      accessLevel: invitation.accessLevel,
      expiresAt: invitation.expiresAt,
    });
  }

  if (invitation.status !== 'pending') {
    return c.json({
      status: invitation.status,
      familyName: null,
      accessLevel: invitation.accessLevel,
      expiresAt: invitation.expiresAt,
    });
  }

  const family = await familyRepo.findById(invitation.familyId);

  return c.json({
    status: 'pending',
    familyId: invitation.familyId,
    familyName: family?.name ?? null,
    accessLevel: invitation.accessLevel,
    expiresAt: invitation.expiresAt,
  });
});
