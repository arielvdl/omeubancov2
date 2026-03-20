import { Hono } from 'hono';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { subscriptionService } from '../services/subscription.service.js';
import { subscriptionRepo } from '../repositories/subscription.repo.js';
import { AppError } from '../middleware/error-handler.js';

export const subscriptionRoutes = new Hono();

// GET /subscription — current subscription status + limits
subscriptionRoutes.get('/', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const { subscription, entitlement, limits } = await subscriptionService.getSubscription(user.familyId);

  return c.json({
    entitlement,
    isActive: subscription?.isActive ?? false,
    productId: subscription?.productId ?? null,
    store: subscription?.store ?? null,
    expiresAt: subscription?.expiresAt ?? null,
    limits,
  });
});

// GET /subscription/limits — current usage vs limits
subscriptionRoutes.get('/limits', authMiddleware, requireParent, async (c) => {
  const user = c.get('user');
  const entitlement = await subscriptionService.getEntitlementForFamily(user.familyId);
  const limits = subscriptionService.getTierLimits(entitlement);

  const [childCheck, receiptCheck] = await Promise.all([
    subscriptionService.checkChildLimit(user.familyId),
    subscriptionService.checkReceiptLimit(user.familyId),
  ]);

  return c.json({
    entitlement,
    limits,
    usage: {
      children: childCheck,
      receipts: receiptCheck,
      canInviteGuardians: limits.canInviteGuardians,
    },
  });
});

export const webhookRoutes = new Hono();

// POST /webhooks/revenuecat — RevenueCat webhook handler
webhookRoutes.post('/revenuecat', async (c) => {
  // Validate webhook secret
  const authHeader = c.req.header('Authorization');
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    throw new AppError(401, 'Invalid webhook authorization');
  }

  const body = await c.req.json();
  const event = body.event;

  if (!event) {
    throw new AppError(400, 'Missing event data');
  }

  const { type, app_user_id, product_id, store, expiration_at_ms, original_purchase_date_ms } = event;

  // app_user_id is the familyId we set during RevenueCat logIn
  const familyId = app_user_id;
  if (!familyId) {
    throw new AppError(400, 'Missing app_user_id');
  }

  // Determine entitlement from product_id
  const entitlementFromProduct = (pid: string): string => {
    if (pid?.includes('familia_plus')) return 'familia_plus';
    if (pid?.includes('familia')) return 'familia';
    return 'free';
  };

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE': {
      const entitlement = entitlementFromProduct(product_id);
      await subscriptionRepo.upsert({
        familyId,
        revenuecatCustomerId: familyId,
        entitlement,
        productId: product_id,
        store: store ?? null,
        isActive: true,
        expiresAt: expiration_at_ms ? new Date(expiration_at_ms) : null,
        originalPurchaseDate: original_purchase_date_ms ? new Date(original_purchase_date_ms) : null,
        unsubscribeDetectedAt: null,
      });
      break;
    }
    case 'CANCELLATION':
    case 'EXPIRATION': {
      await subscriptionRepo.deactivate(familyId);
      await subscriptionService.onSubscriptionCancelled(familyId);
      break;
    }
    default:
      // Ignore other event types
      break;
  }

  return c.json({ status: 'ok' });
});
