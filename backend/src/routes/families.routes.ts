import { Hono } from 'hono';
import { authMiddleware, requireParent, requireFamilyOwner, requireFamilyAdmin } from '../auth/guards.js';
import { familyRepo } from '../repositories/family.repo.js';
import { updateFamilySchema } from '../validators/index.js';
import { AppError, NotFoundError } from '../middleware/error-handler.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';
import { membershipService } from '../services/membership.service.js';
import { generateToken } from '../auth/index.js';

export const familiesRoutes = new Hono();

familiesRoutes.use('/*', authMiddleware, requireParent);

// Multi-família: lista as famílias acessíveis pela identidade do token
familiesRoutes.get('/memberships', async (c) => {
  const user = c.get('user');
  const identity = await membershipService.getIdentityForUser(user);
  if (!identity) {
    throw new AppError(401, 'Invalid or expired token');
  }
  const families = await membershipService.listFamilies(identity);
  return c.json({ families, currentFamilyId: user.familyId });
});

// Multi-família: troca a família ativa (emite novo token)
familiesRoutes.post('/switch', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const targetFamilyId = typeof body?.familyId === 'string' ? body.familyId : '';
  if (!targetFamilyId) {
    throw new AppError(400, 'familyId is required');
  }

  const identity = await membershipService.getIdentityForUser(user);
  if (!identity) {
    throw new AppError(401, 'Invalid or expired token');
  }

  const memberships = await membershipService.listFamilies(identity);
  const target = memberships.find((m) => m.familyId === targetFamilyId);
  if (!target) {
    throw new AppError(403, 'Not a member of this family');
  }

  const family = await familyRepo.findById(target.familyId);
  if (!family) {
    throw new NotFoundError('Family');
  }

  const token = await generateToken({
    familyId: target.familyId,
    role: 'parent',
    guardianId: target.role === 'guardian' ? target.guardianId : undefined,
    guardianAccessLevel:
      target.role === 'guardian'
        ? target.accessLevel === 'admin'
          ? 'admin'
          : 'member'
        : undefined,
  });

  await auditLogRepo.create({
    familyId: target.familyId,
    action: 'family.switch',
    actor: target.role === 'guardian' ? `guardian:${target.guardianId}` : 'parent',
  });

  return c.json({
    token,
    family: {
      id: family.id,
      name: family.name,
      currency: family.currency,
      locale: family.locale,
      timezone: family.timezone,
    },
    guardianId: target.role === 'guardian' ? target.guardianId : undefined,
    roleLabel: target.role === 'guardian' ? target.roleLabel : undefined,
    guardianAccessLevel: target.role === 'guardian' ? target.accessLevel : undefined,
  });
});

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

familiesRoutes.put('/', requireFamilyAdmin, async (c) => {
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
