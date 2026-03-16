import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { generalRateLimit } from './middleware/rate-limit.js';
import { localeMiddleware } from './middleware/locale.js';
import { authRoutes } from './routes/auth.routes.js';
import { familiesRoutes } from './routes/families.routes.js';
import { childrenRoutes } from './routes/children.routes.js';
import { transactionsRoutes } from './routes/transactions.routes.js';
import { scheduledRoutes } from './routes/scheduled.routes.js';
import { contractsRoutes } from './routes/contracts.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { cronRoutes } from './routes/cron.routes.js';
import { oauthCallbackRoutes } from './routes/oauth-callback.routes.js';
import { invitationsRoutes } from './routes/invitations.routes.js';
import { guardiansRoutes } from './routes/guardians.routes.js';

export const app = new Hono();

app.use('*', corsMiddleware);
app.use('*', loggerMiddleware);
app.use('*', localeMiddleware);

app.onError(errorHandler);

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = new Hono();
api.use('*', generalRateLimit);

api.route('/auth', authRoutes);
api.route('/families', familiesRoutes);
api.route('/children', childrenRoutes);
api.route('/', transactionsRoutes);
api.route('/', scheduledRoutes);
api.route('/', contractsRoutes);
api.route('/', analyticsRoutes);
api.route('/', notificationsRoutes);
api.route('/invitations', invitationsRoutes);
api.route('/guardians', guardiansRoutes);

app.route('/api/v1', api);

const internal = new Hono();
internal.route('/', cronRoutes);

app.route('/api/internal', internal);

// OAuth callback routes (outside rate limit)
app.route('/auth', oauthCallbackRoutes);

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});
