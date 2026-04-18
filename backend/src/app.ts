import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { loggerMiddleware } from './middleware/logger.js';
import { securityHeaders } from './middleware/security-headers.js';
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
import { passkeyRoutes } from './routes/passkey.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { wishlistRoutes } from './routes/wishlist.routes.js';
import { subscriptionRoutes, webhookRoutes } from './routes/subscription.routes.js';
import { env } from './config/index.js';

export const app = new Hono();

app.use('*', corsMiddleware);
app.use('*', securityHeaders);
app.use('*', loggerMiddleware);
app.use('*', localeMiddleware);

app.onError(errorHandler);

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apple App Site Association for Passkeys
app.get('/.well-known/apple-app-site-association', (c) => {
  return c.json({
    webcredentials: {
      apps: ['8TA8YQY457.com.omeubanco-app'],
    },
  });
});

app.get('/.well-known/oauth-protected-resource', (c) => {
  const docsUrl = 'https://omeubanco.xyz/docs/api';
  const publicUrl = env.PUBLIC_URL.replace(/\/+$/, '');

  return c.json({
    resource: publicUrl,
    authorization_servers: [],
    scopes_supported: [],
    bearer_methods_supported: ['header'],
    resource_name: 'O Meu Banco API',
    resource_documentation: docsUrl,
    resource_policy_uri: 'https://omeubanco.xyz/privacidade',
    resource_tos_uri: 'https://omeubanco.xyz/termos',
  });
});

const api = new Hono();
api.use('*', generalRateLimit);

api.route('/auth', authRoutes);
api.route('/auth/passkey', passkeyRoutes);
api.route('/families', familiesRoutes);
api.route('/children', childrenRoutes);
api.route('/', transactionsRoutes);
api.route('/', scheduledRoutes);
api.route('/', contractsRoutes);
api.route('/', analyticsRoutes);
api.route('/', notificationsRoutes);
api.route('/invitations', invitationsRoutes);
api.route('/guardians', guardiansRoutes);
api.route('/upload', uploadRoutes);
api.route('/', wishlistRoutes);
api.route('/subscription', subscriptionRoutes);

app.route('/api/v1', api);

const internal = new Hono();
internal.route('/', cronRoutes);

app.route('/api/internal', internal);

// OAuth callback routes (outside rate limit)
app.route('/auth', oauthCallbackRoutes);

// Webhook routes (outside rate limit, own auth)
app.route('/webhooks', webhookRoutes);

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});
