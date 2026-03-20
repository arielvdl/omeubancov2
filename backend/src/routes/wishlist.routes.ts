import { Hono } from 'hono';
import { authMiddleware } from '../auth/guards.js';
import { childRepo } from '../repositories/child.repo.js';
import { wishItemRepo } from '../repositories/wish-item.repo.js';
import { NotFoundError, ForbiddenError } from '../middleware/error-handler.js';
import { createWishItemSchema, updateWishItemSchema } from '../validators/index.js';

export const wishlistRoutes = new Hono();

wishlistRoutes.use('/*', authMiddleware);

// GET /children/:id/wishlist — list all wish items for a child
wishlistRoutes.get('/children/:id/wishlist', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');
  if (user.role === 'child' && user.childId !== childId) {
    throw new ForbiddenError('Access denied');
  }

  const items = await wishItemRepo.findByChildId(childId);
  return c.json({ data: items });
});

// GET /children/:id/wishlist/goal — get the current goal
wishlistRoutes.get('/children/:id/wishlist/goal', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const goal = await wishItemRepo.getGoal(childId);
  return c.json({ data: goal ?? null });
});

// POST /children/:id/wishlist — create a new wish item
wishlistRoutes.post('/children/:id/wishlist', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  // Subscription gating: check wish item limit
  try {
    const { subscriptionService } = await import('../services/subscription.service.js');
    const wishCheck = await subscriptionService.checkWishItemLimit(user.familyId, childId);
    if (!wishCheck.allowed) {
      return c.json({
        error: 'subscription_required',
        feature: 'wish_item',
        current: wishCheck.current,
        limit: wishCheck.limit,
      }, 403);
    }
  } catch (err: any) {
    console.error('Subscription check failed:', { familyId: user.familyId, error: err.message });
    // Allow creation if subscription check fails (graceful degradation)
  }

  const body = await c.req.json();
  const data = createWishItemSchema.parse(body);

  const item = await wishItemRepo.create({
    childId,
    photoUrl: data.photoUrl,
    name: data.name,
    priceCents: data.priceCents,
    desireLevel: data.desireLevel,
    note: data.note,
  });

  return c.json({ data: item }, 201);
});

// PUT /children/:id/wishlist/:itemId — update a wish item
wishlistRoutes.put('/children/:id/wishlist/:itemId', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const itemId = c.req.param('itemId') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const item = await wishItemRepo.findById(itemId);
  if (!item) throw new NotFoundError('Wish item');
  if (item.childId !== childId) throw new ForbiddenError('Access denied');

  const body = await c.req.json();
  const data = updateWishItemSchema.parse(body);

  const updated = await wishItemRepo.update(itemId, data);
  return c.json({ data: updated });
});

// POST /children/:id/wishlist/:itemId/conquer — mark as conquered
wishlistRoutes.post('/children/:id/wishlist/:itemId/conquer', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const itemId = c.req.param('itemId') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const item = await wishItemRepo.findById(itemId);
  if (!item) throw new NotFoundError('Wish item');
  if (item.childId !== childId) throw new ForbiddenError('Access denied');

  const updated = await wishItemRepo.update(itemId, {
    status: 'conquered',
    conqueredAt: new Date(),
  });
  return c.json({ data: updated });
});

// POST /children/:id/wishlist/:itemId/archive — mark as "don't want anymore"
wishlistRoutes.post('/children/:id/wishlist/:itemId/archive', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const itemId = c.req.param('itemId') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const item = await wishItemRepo.findById(itemId);
  if (!item) throw new NotFoundError('Wish item');
  if (item.childId !== childId) throw new ForbiddenError('Access denied');

  const updated = await wishItemRepo.update(itemId, { status: 'archived' });
  return c.json({ data: updated });
});

// POST /children/:id/wishlist/:itemId/goal — set as goal
wishlistRoutes.post('/children/:id/wishlist/:itemId/goal', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const itemId = c.req.param('itemId') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const item = await wishItemRepo.findById(itemId);
  if (!item) throw new NotFoundError('Wish item');
  if (item.childId !== childId) throw new ForbiddenError('Access denied');

  const updated = await wishItemRepo.setGoal(childId, itemId);
  return c.json({ data: updated });
});

// DELETE /children/:id/wishlist/:itemId — delete a wish item
wishlistRoutes.delete('/children/:id/wishlist/:itemId', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;
  const itemId = c.req.param('itemId') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const item = await wishItemRepo.findById(itemId);
  if (!item) throw new NotFoundError('Wish item');
  if (item.childId !== childId) throw new ForbiddenError('Access denied');

  await wishItemRepo.delete(itemId);
  return c.json({ success: true });
});

// POST /children/:id/wishlist/reorder — reorder wish items
wishlistRoutes.post('/children/:id/wishlist/reorder', async (c) => {
  const user = c.get('user');
  const childId = c.req.param('id') as string;

  const child = await childRepo.findById(childId);
  if (!child) throw new NotFoundError('Child');
  if (child.familyId !== user.familyId) throw new ForbiddenError('Access denied');

  const body = await c.req.json();
  const items = body.items as { id: string; sortOrder: number }[];

  await wishItemRepo.reorder(items);
  return c.json({ success: true });
});
