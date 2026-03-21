import { Hono } from 'hono';
import { env } from '../config/index.js';
import { scheduledDepositService } from '../services/scheduled-deposit.service.js';
import { notificationService } from '../services/notification.service.js';

export const cronRoutes = new Hono();

cronRoutes.post('/cron/process-deposits', async (c) => {
  const cronSecret = c.req.header('X-Cron-Secret');
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const result = await scheduledDepositService.processDueDeposits();

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'cron.process-deposits',
      processed: result.processed,
      errors: result.errors,
    })
  );

  return c.json({
    success: true,
    processed: result.processed,
    errors: result.errors,
  });
});

// Broadcast push notification to all users or specific families
cronRoutes.post('/cron/push-broadcast', async (c) => {
  const cronSecret = c.req.header('X-Cron-Secret');
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { title, body: message, data, familyIds } = body as {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    familyIds?: string[];
  };

  if (!title || !message) {
    return c.json({ error: 'title and body are required' }, 400);
  }

  if (familyIds && familyIds.length > 0) {
    await notificationService.sendToFamilies(familyIds, title, message, data);
  } else {
    await notificationService.sendToAll(title, message, data);
  }

  return c.json({ success: true });
});
