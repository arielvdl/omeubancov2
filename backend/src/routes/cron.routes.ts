import { Hono } from 'hono';
import { env } from '../config/index.js';
import { scheduledDepositService } from '../services/scheduled-deposit.service.js';

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
