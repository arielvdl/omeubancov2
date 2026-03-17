import { Hono } from 'hono';
import { authMiddleware, requireParent, requireFamilyOwner } from '../auth/guards.js';
import { familyRepo } from '../repositories/family.repo.js';
import { updateFamilySchema } from '../validators/index.js';
import { NotFoundError } from '../middleware/error-handler.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

export const familiesRoutes = new Hono();

familiesRoutes.use('/*', authMiddleware, requireParent);

familiesRoutes.get('/', async (c) => {
  const user = c.get('user');
  const family = await familyRepo.findById(user.familyId);

  if (!family) {
    throw new NotFoundError('Family');
  }

  return c.json({
    id: family.id,
    name: family.name,
    currency: family.currency,
    locale: family.locale,
    timezone: family.timezone,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  });
});

familiesRoutes.put('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const data = updateFamilySchema.parse(body);

  const family = await familyRepo.update(user.familyId, data);
  if (!family) {
    throw new NotFoundError('Family');
  }

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'family.update',
    actor: 'parent',
    details: data,
  });

  return c.json({
    id: family.id,
    name: family.name,
    currency: family.currency,
    locale: family.locale,
    timezone: family.timezone,
    updatedAt: family.updatedAt,
  });
});

familiesRoutes.delete('/', requireFamilyOwner, async (c) => {
  const user = c.get('user');
  const family = await familyRepo.findById(user.familyId);

  if (!family) {
    throw new NotFoundError('Family');
  }

  await familyRepo.delete(user.familyId);

  return c.body(null, 204);
});
