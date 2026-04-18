import { Hono } from 'hono';
import { authMiddleware, requireFamilyAdmin } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { contractRepo } from '../repositories/contract.repo.js';
import { createContractSchema, signContractSchema } from '../validators/index.js';
import { NotFoundError, ForbiddenError, AppError } from '../middleware/error-handler.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

export const contractsRoutes = new Hono();

contractsRoutes.use('/*', authMiddleware);

contractsRoutes.get('/children/:id/contract', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');
  if (user.role === 'child' && user.childId !== childId) throw new ForbiddenError('Access denied');

  const contract = await contractRepo.findActiveByChildId(childId);
  if (!contract) {
    return c.json(null);
  }

  return c.json({
    id: contract.id,
    content: contract.content,
    parentSignedAt: contract.parentSignedAt,
    childSignedAt: contract.childSignedAt,
    hasChildSignature: !!contract.childSignatureData,
    isActive: contract.isActive,
    createdAt: contract.createdAt,
  });
});

contractsRoutes.post('/children/:id/contract', requireFamilyAdmin, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const body = await c.req.json();
  const data = createContractSchema.parse(body);

  if (data.childId !== childId) {
    throw new AppError(400, 'Child ID mismatch');
  }

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  await contractRepo.deactivateByChildId(childId);

  const contract = await contractRepo.create({
    familyId: user.familyId,
    childId,
    content: data.content,
    parentSignedAt: new Date(),
    ...(data.childSignatureData
      ? { childSignatureData: data.childSignatureData, childSignedAt: new Date() }
      : {}),
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'contract.create',
    actor: 'parent',
    details: { contractId: contract.id, childId },
  });

  return c.json(
    {
      id: contract.id,
      content: contract.content,
      parentSignedAt: contract.parentSignedAt,
      childSignedAt: contract.childSignedAt,
      isActive: contract.isActive,
      createdAt: contract.createdAt,
    },
    201
  );
});

contractsRoutes.delete('/children/:id/contract', requireFamilyAdmin, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const contract = await contractRepo.findActiveByChildId(childId);
  if (!contract) throw new NotFoundError('Contract');

  await contractRepo.deactivateByChildId(childId);

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'contract.delete',
    actor: 'parent',
    details: { contractId: contract.id, childId },
  });

  return c.json({ success: true });
});

contractsRoutes.post('/children/:id/contract/sign', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  if (user.role === 'child' && user.childId !== childId) {
    throw new ForbiddenError('Can only sign own contract');
  }

  if (user.role === 'parent') {
    const child = await childRepo.findById(childId);
    if (!child || child.familyId !== user.familyId) throw new ForbiddenError('Access denied');
  }

  const body = await c.req.json();
  const data = signContractSchema.parse(body);

  const contract = await contractRepo.findActiveByChildId(childId);
  if (!contract) throw new NotFoundError('Contract');

  if (contract.childSignedAt) {
    throw new AppError(400, 'Contract already signed');
  }

  const signed = await contractRepo.signByChild(contract.id, data.signatureData);

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'contract.sign',
    actor: `child:${childId}`,
    details: { contractId: contract.id },
  });

  return c.json({
    id: signed!.id,
    childSignedAt: signed!.childSignedAt,
    isActive: signed!.isActive,
  });
});
