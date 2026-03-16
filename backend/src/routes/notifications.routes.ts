import { Hono } from 'hono';
import { authMiddleware } from '../auth/guards.js';
import { deviceRepo } from '../repositories/device.repo.js';
import { deviceSchema } from '../validators/index.js';

export const notificationsRoutes = new Hono();

notificationsRoutes.use('/*', authMiddleware);

notificationsRoutes.post('/devices', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const data = deviceSchema.parse(body);

  const device = await deviceRepo.upsert({
    familyId: user.familyId,
    childId: user.role === 'child' ? user.childId : undefined,
    pushToken: data.pushToken,
    platform: data.platform,
  });

  return c.json(
    {
      id: device.id,
      pushToken: device.pushToken,
      platform: device.platform,
    },
    201
  );
});

notificationsRoutes.delete('/devices', async (c) => {
  const body = await c.req.json();
  const data = deviceSchema.parse(body);

  await deviceRepo.deleteByPushToken(data.pushToken);

  return c.json({ success: true });
});
