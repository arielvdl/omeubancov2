import { Hono } from 'hono';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { scheduledDepositRepo } from '../repositories/scheduled-deposit.repo.js';
import { createScheduleSchema } from '../validators/index.js';
import { NotFoundError, ForbiddenError, AppError } from '../middleware/error-handler.js';
import { scheduledDepositService } from '../services/scheduled-deposit.service.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

export const scheduledRoutes = new Hono();

scheduledRoutes.use('/*', authMiddleware);

scheduledRoutes.get('/children/:id/schedules', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const schedules = await scheduledDepositRepo.findByChildId(childId);
  return c.json(schedules);
});

scheduledRoutes.post('/children/:id/schedules', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const body = await c.req.json();
  const data = createScheduleSchema.parse(body);

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const now = new Date();
  let nextRunAt: Date;

  switch (data.frequency) {
    case 'daily':
      nextRunAt = new Date(now);
      nextRunAt.setDate(nextRunAt.getDate() + 1);
      nextRunAt.setHours(8, 0, 0, 0);
      break;
    case 'weekly': {
      nextRunAt = new Date(now);
      const currentDay = nextRunAt.getDay();
      const targetDay = data.dayOfWeek!;
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      nextRunAt.setDate(nextRunAt.getDate() + daysUntil);
      nextRunAt.setHours(8, 0, 0, 0);
      break;
    }
    case 'monthly': {
      nextRunAt = new Date(now);
      nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      nextRunAt.setDate(Math.min(data.dayOfMonth!, 28));
      nextRunAt.setHours(8, 0, 0, 0);
      break;
    }
    default:
      nextRunAt = new Date(now);
      nextRunAt.setDate(nextRunAt.getDate() + 1);
  }

  const schedule = await scheduledDepositRepo.create({
    familyId: user.familyId,
    childId,
    amount: data.amount,
    frequency: data.frequency,
    dayOfWeek: data.dayOfWeek,
    dayOfMonth: data.dayOfMonth,
    nextRunAt,
    status: 'active',
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'schedule.create',
    actor: 'parent',
    details: { scheduleId: schedule.id, childId, frequency: data.frequency, amount: data.amount },
  });

  return c.json(schedule, 201);
});

scheduledRoutes.put('/children/:id/schedules/:sid', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const scheduleId = c.req.param('sid') as string;
  const body = await c.req.json();
  const data = createScheduleSchema.parse(body);

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const existing = await scheduledDepositRepo.findById(scheduleId);
  if (!existing || existing.childId !== childId) throw new NotFoundError('Schedule');

  const schedule = await scheduledDepositRepo.update(scheduleId, {
    amount: data.amount,
    frequency: data.frequency,
    dayOfWeek: data.dayOfWeek,
    dayOfMonth: data.dayOfMonth,
  });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'schedule.update',
    actor: 'parent',
    details: { scheduleId, childId },
  });

  return c.json(schedule);
});

scheduledRoutes.post('/children/:id/schedules/:sid/pause', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const scheduleId = c.req.param('sid') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const existing = await scheduledDepositRepo.findById(scheduleId);
  if (!existing || existing.childId !== childId) throw new NotFoundError('Schedule');
  if (existing.status !== 'active') throw new AppError(400, 'Schedule is not active');

  const schedule = await scheduledDepositRepo.update(scheduleId, { status: 'paused' });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'schedule.pause',
    actor: 'parent',
    details: { scheduleId, childId },
  });

  return c.json(schedule);
});

scheduledRoutes.post('/children/:id/schedules/:sid/resume', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const scheduleId = c.req.param('sid') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const existing = await scheduledDepositRepo.findById(scheduleId);
  if (!existing || existing.childId !== childId) throw new NotFoundError('Schedule');
  if (existing.status !== 'paused') throw new AppError(400, 'Schedule is not paused');

  const now = new Date();
  const nextRunAt = scheduledDepositService.calculateNextRun(existing.frequency, now);

  const schedule = await scheduledDepositRepo.update(scheduleId, { status: 'active' });
  await scheduledDepositRepo.updateNextRun(scheduleId, nextRunAt, existing.lastRunAt || now);

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'schedule.resume',
    actor: 'parent',
    details: { scheduleId, childId },
  });

  return c.json(schedule);
});

scheduledRoutes.delete('/children/:id/schedules/:sid', requireParent, async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const scheduleId = c.req.param('sid') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const existing = await scheduledDepositRepo.findById(scheduleId);
  if (!existing || existing.childId !== childId) throw new NotFoundError('Schedule');

  await scheduledDepositRepo.update(scheduleId, { status: 'cancelled' });

  await auditLogRepo.create({
    familyId: user.familyId,
    action: 'schedule.cancel',
    actor: 'parent',
    details: { scheduleId, childId },
  });

  return c.json({ success: true });
});
