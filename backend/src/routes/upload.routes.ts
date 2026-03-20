import { Hono } from 'hono';
import { Storage } from '@google-cloud/storage';
import { authMiddleware, requireParent } from '../auth/guards.js';
import { AppError } from '../middleware/error-handler.js';

const BUCKET_NAME = 'omeubanco-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

export const uploadRoutes = new Hono();

// POST /upload/avatar — upload avatar image to GCS
uploadRoutes.post('/avatar', authMiddleware, requireParent, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(400, 'File too large. Max 5MB');
  }

  const user = c.get('user');
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `avatars/${user.familyId}/${Date.now()}.${ext}`;

  const gcsFile = bucket.file(filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await gcsFile.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
  } catch (err: any) {
    console.error('GCS upload failed:', { filename, error: err.message, code: err.code });
    throw new AppError(500, 'Failed to upload file to storage');
  }


  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

  return c.json({ url: publicUrl });
});

// POST /upload/receipt — upload receipt image to GCS
uploadRoutes.post('/receipt', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(400, 'File too large. Max 5MB');
  }

  const user = c.get('user');

  // Subscription gating: check receipt limit
  const { subscriptionService } = await import('../services/subscription.service.js');
  const receiptCheck = await subscriptionService.checkReceiptLimit(user.familyId);
  if (!receiptCheck.allowed) {
    return c.json({
      error: 'subscription_required',
      feature: 'receipt',
      current: receiptCheck.current,
      limit: receiptCheck.limit,
    }, 403);
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `receipts/${user.familyId}/${Date.now()}.${ext}`;

  const gcsFile = bucket.file(filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await gcsFile.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
  } catch (err: any) {
    console.error('GCS upload failed:', { filename, error: err.message, code: err.code });
    throw new AppError(500, 'Failed to upload file to storage');
  }


  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

  return c.json({ url: publicUrl });
});

// POST /upload/wishlist — upload wishlist item photo to GCS
uploadRoutes.post('/wishlist', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(400, 'File too large. Max 5MB');
  }

  const user = c.get('user');
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `wishlist/${user.familyId}/${Date.now()}.${ext}`;

  const gcsFile = bucket.file(filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await gcsFile.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
  } catch (err: any) {
    console.error('GCS upload failed:', { filename, error: err.message, code: err.code });
    throw new AppError(500, 'Failed to upload file to storage');
  }


  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

  return c.json({ url: publicUrl });
});
