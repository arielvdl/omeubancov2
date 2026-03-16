import { Hono } from 'hono';
import { authMiddleware } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { analyticsService } from '../services/analytics.service.js';
import { periodSchema } from '../validators/index.js';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler.js';

export const analyticsRoutes = new Hono();

analyticsRoutes.use('/*', authMiddleware);

analyticsRoutes.get('/children/:id/analytics', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');
  if (user.role === 'child' && user.childId !== childId) throw new ForbiddenError('Access denied');

  const query = periodSchema.parse({ period: c.req.query('period') });

  const [summary, breakdown] = await Promise.all([
    analyticsService.getChildSummary(childId, query.period),
    analyticsService.getCategoryBreakdown(childId, query.period),
  ]);

  return c.json({
    period: query.period,
    summary,
    categoryBreakdown: breakdown,
    currentBalance: child.balance,
  });
});
