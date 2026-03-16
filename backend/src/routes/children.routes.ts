import { Hono } from 'hono';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { createChildSchema, updateChildSchema } from '../validators/index.js';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler.js';
import { hashPassword } from '../auth/index.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

export const childrenRoutes = new Hono();

childrenRoutes.use('/*', authMiddleware);

childrenRoutes.get('/', requireParent, async (c) => {
  const user = c.get('user');
  const kids = await childRepo.findByFamilyId(user.familyId);

  return c.json(
    kids.map((child) => ({
      id: child.id,
      name: child.name,
      avatarUrl: child.avatarUrl,
      balance: child.balance,
      birthDate: child.birthDate,
      hasPin: !!child.pinHash,
      createdAt: child.createdAt,
    }))
  );
});

childrenRoutes.post('/', requireParent, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const data = createChildSchema.parse(body);

  let pinHash: string | undefined;
  if (data.pin) {
    pinHash = await hashPassword(data.pin);
  }

  const child = await childRepo.create({
    familyId: user.familyId,
    name: data.name,
    pinHash,
    avatarUrl: data.avatarUrl,
    birthDate: data.birthDate,
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'child.create',
    actor: 'parent',
    details: { childId: child.id, name: child.name },
  });

  return c.json(
    {
      id: child.id,
      name: child.name,
      avatarUrl: child.avatarUrl,
      balance: child.balance,
      birthDate: child.birthDate,
      hasPin: !!child.pinHash,
      createdAt: child.createdAt,
    },
    201
  );
});

childrenRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) {
    throw new NotFoundError('Child');
  }

  if (child.familyId !== user.familyId) {
    throw new ForbiddenError('Access denied');
  }

  if (user.role === 'child' && user.childId !== childId) {
    throw new ForbiddenError('Access denied');
  }

  return c.json({
    id: child.id,
    name: child.name,
    avatarUrl: child.avatarUrl,
    balance: child.balance,
    birthDate: child.birthDate,
    hasPin: !!child.pinHash,
    createdAt: child.createdAt,
    updatedAt: child.updatedAt,
  });
});

childrenRoutes.put('/:id', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const body = await c.req.json();
  const data = updateChildSchema.parse(body);

  const existing = await childRepo.findById(childId);
  if (!existing) {
    throw new NotFoundError('Child');
  }
  if (existing.familyId !== user.familyId) {
    throw new ForbiddenError('Access denied');
  }

  let pinHash: string | undefined;
  if (data.pin) {
    pinHash = await hashPassword(data.pin);
  }

  const updateData: Partial<{ name: string; avatarUrl: string | null; birthDate: string | null; pinHash: string }> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
  if (pinHash !== undefined) updateData.pinHash = pinHash;

  const child = await childRepo.update(childId, updateData);
  if (!child) {
    throw new NotFoundError('Child');
  }

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'child.update',
    actor: 'parent',
    details: { childId, changes: Object.keys(data) },
  });

  return c.json({
    id: child.id,
    name: child.name,
    avatarUrl: child.avatarUrl,
    balance: child.balance,
    birthDate: child.birthDate,
    hasPin: !!child.pinHash,
    updatedAt: child.updatedAt,
  });
});

childrenRoutes.delete('/:id', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) {
    throw new NotFoundError('Child');
  }
  if (child.familyId !== user.familyId) {
    throw new ForbiddenError('Access denied');
  }

  await childRepo.delete(childId);

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'child.delete',
    actor: 'parent',
    details: { childId, name: child.name },
  });

  return c.json({ success: true });
});
