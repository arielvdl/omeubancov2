import { Hono } from 'hono';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { transactionRepo } from '../repositories/transaction.repo.js';
import { depositSchema, withdrawSchema, paginationSchema } from '../validators/index.js';
import {
  NotFoundError,
  ForbiddenError,
  InsufficientFundsError,
} from '../middleware/error-handler.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

export const transactionsRoutes = new Hono();

transactionsRoutes.use('/*', authMiddleware);

transactionsRoutes.post('/children/:id/deposit', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const body = await c.req.json();
  const data = depositSchema.parse(body);

  const child = await childRepo.findById(childId);
  if (!child) {
    throw new NotFoundError('Child');
  }
  if (child.familyId !== user.familyId) {
    throw new ForbiddenError('Access denied');
  }

  const rawSql = childRepo.getRawSql();
  let resultBalance = 0;

  await rawSql.begin(async (txSql) => {
    const locked = await childRepo.findByIdForUpdate(txSql, childId);
    if (!locked) {
      throw new NotFoundError('Child');
    }

    const newBalance = locked.balance + data.amount;

    await transactionRepo.createInTx(txSql, {
      childId,
      familyId: user.familyId,
      type: 'deposit',
      category: data.category,
      amount: data.amount,
      balanceAfter: newBalance,
      description: data.description || '',
      createdBy: 'parent',
    });

    await childRepo.updateBalanceInTx(txSql, childId, newBalance);

    resultBalance = newBalance;
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'transaction.deposit',
    actor: 'parent',
    details: { childId, amount: data.amount, category: data.category },
  });

  return c.json(
    {
      success: true,
      balanceAfter: resultBalance,
    },
    201
  );
});

transactionsRoutes.post('/children/:id/withdraw', async (c) => {
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
    throw new ForbiddenError('Can only withdraw from own account');
  }

  const body = await c.req.json();
  const data = withdrawSchema.parse(body);

  const rawSql = childRepo.getRawSql();
  let resultBalance = 0;

  await rawSql.begin(async (txSql) => {
    const locked = await childRepo.findByIdForUpdate(txSql, childId);
    if (!locked) {
      throw new NotFoundError('Child');
    }

    if (locked.balance < data.amount) {
      throw new InsufficientFundsError();
    }

    const newBalance = locked.balance - data.amount;

    await transactionRepo.createInTx(txSql, {
      childId,
      familyId: user.familyId,
      type: 'withdrawal',
      category: 'compra',
      amount: data.amount,
      balanceAfter: newBalance,
      description: data.description || '',
      createdBy: user.role === 'parent' ? 'parent' : 'child',
    });

    await childRepo.updateBalanceInTx(txSql, childId, newBalance);

    resultBalance = newBalance;
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'transaction.withdrawal',
    actor: user.role === 'parent' ? 'parent' : `child:${childId}`,
    details: { childId, amount: data.amount },
  });

  return c.json(
    {
      success: true,
      balanceAfter: resultBalance,
    },
    201
  );
});

transactionsRoutes.get('/children/:id/transactions', async (c) => {
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

  const query = paginationSchema.parse(c.req.query());
  const type = c.req.query('type');

  const result = await transactionRepo.findByChildId(childId, {
    type: type || undefined,
    page: query.page,
    limit: query.limit,
  });

  return c.json({
    data: result.data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  });
});
