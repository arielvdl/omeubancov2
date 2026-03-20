import crypto from 'node:crypto';
import { Hono } from 'hono';
import { authMiddleware, requireParent, requireFamilyOwner } from '../auth/guards.js';
import { familyInvitationRepo } from '../repositories/family-invitation.repo.js';
import { familyRepo } from '../repositories/family.repo.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { inviteInfoRateLimit, invitationRateLimit } from '../middleware/rate-limit.js';
import { AppError } from '../middleware/error-handler.js';
import { inviteCodeParamSchema } from '../validators/index.js';

export const invitationsRoutes = new Hono();

function generateInviteCode(): string {
  return crypto.randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
}

// Create invitation (owner only)
invitationsRoutes.post('/', authMiddleware, requireFamilyOwner, invitationRateLimit, async (c) => {
  const user = c.get('user');

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

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  const invitation = await familyInvitationRepo.create({
    familyId: user.familyId,
    inviteCode,
    invitedBy: user.familyId,
    expiresAt,
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'invitation.create',
    actor: 'parent',
    details: { inviteCode },
  });

  return c.json({
    invitation: {
      id: invitation.id,
      inviteCode: invitation.inviteCode,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      deepLink: `omeubanco://invite/${invitation.inviteCode}`,
    },
  }, 201);
});

// List invitations (any parent/guardian)
invitationsRoutes.get('/', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const invitations = await familyInvitationRepo.findByFamilyId(user.familyId);

  return c.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      inviteCode: inv.inviteCode,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      deepLink: `omeubanco://invite/${inv.inviteCode}`,
    })),
  });
});

// Revoke invitation (owner only)
invitationsRoutes.delete('/:id', authMiddleware, requireFamilyOwner, async (c) => {
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
      expiresAt: invitation.expiresAt,
    });
  }

  if (invitation.status !== 'pending') {
    return c.json({
      status: invitation.status,
      familyName: null,
      expiresAt: invitation.expiresAt,
    });
  }

  const family = await familyRepo.findById(invitation.familyId);

  return c.json({
    status: 'pending',
    familyName: family?.name ?? null,
    expiresAt: invitation.expiresAt,
  });
});
