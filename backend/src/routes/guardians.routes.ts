import { Hono } from 'hono';
import { authMiddleware, requireParent, requireFamilyAdmin } from '../auth/guards.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { AppError } from '../middleware/error-handler.js';

export const guardiansRoutes = new Hono();

// List guardians of the family
guardiansRoutes.get('/', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const guardians = await guardianRepo.findByFamilyId(user.familyId);

  return c.json({
    guardians: guardians.map((g) => ({
      id: g.id,
      name: g.name,
      roleLabel: g.roleLabel,
      accessLevel: g.accessLevel,
      email: g.email,
      avatarUrl: g.avatarUrl,
      googlePhoto: g.googlePhoto,
      createdAt: g.createdAt,
    })),
  });
});

// Remove guardian (family admin only, soft delete)
guardiansRoutes.delete('/:id', authMiddleware, requireFamilyAdmin, async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const guardian = await guardianRepo.findById(id);
  if (!guardian || guardian.familyId !== user.familyId) {
    throw new AppError(404, 'Guardian not found');
  }

  if (guardian.status === 'removed') {
    throw new AppError(400, 'Guardian already removed');
  }

  await guardianRepo.remove(id);

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'guardian.remove',
    actor: 'parent',
    details: { guardianId: id, guardianName: guardian.name },
  });

  return c.json({ message: 'Guardian removed' });
});
