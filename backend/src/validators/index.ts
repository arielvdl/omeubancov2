import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../config/currencies.js';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  bankName: z.string().min(3).max(100),
  currency: z.enum(SUPPORTED_CURRENCIES).default('BRL'),
  locale: z.string().min(2).max(10).default('pt-BR'),
  timezone: z.string().min(3).max(50).default('America/Sao_Paulo'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const childLoginSchema = z.object({
  childId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export const createChildSchema = z.object({
  name: z.string().min(2).max(100),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits').optional(),
  avatarUrl: z.string().max(500).optional(),
  mascotId: z.string().max(50).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
});

export const updateChildSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits').optional(),
  avatarUrl: z.string().max(500).optional().nullable(),
  mascotId: z.string().max(50).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
});

export const depositSchema = z.object({
  amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
  category: z.enum(['mesada', 'presente', 'tarefa', 'bonus', 'outro']),
  description: z.string().max(500).optional().default(''),
});

export const withdrawSchema = z.object({
  amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
  category: z.enum(['compra', 'presente', 'tarefa', 'bonus', 'outro']).default('compra'),
  description: z.string().max(500).optional().default(''),
  receiptUrl: z.string().url().max(500).optional(),
});

export const createScheduleSchema = z
  .object({
    amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  })
  .refine(
    (data) => {
      if (data.frequency === 'weekly' && data.dayOfWeek === undefined) return false;
      if (data.frequency === 'monthly' && data.dayOfMonth === undefined) return false;
      return true;
    },
    {
      message: 'dayOfWeek is required for weekly frequency, dayOfMonth is required for monthly frequency',
    }
  );

export const createContractSchema = z.object({
  content: z.string().min(1).max(10000),
  childId: z.string().uuid(),
  childSignatureData: z.string().min(1).optional(),
});

export const signContractSchema = z.object({
  signatureData: z.string().min(1),
});

export const deviceSchema = z.object({
  pushToken: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android']),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
});

export const periodSchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('month'),
});

export const updateFamilySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(3).max(50).optional(),
});

export const guardianAccessLevelSchema = z.enum(['admin', 'member']);

export const createInvitationSchema = z.object({
  accessLevel: guardianAccessLevelSchema.default('member'),
});

export const googleAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().min(1, 'Redirect URI is required'),
  codeVerifier: z.string().optional(),
  clientId: z.string().optional(),
});

export const guardianRegisterSchema = z.object({
  inviteCode: z.string().min(6).max(12),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(2).max(100),
  roleLabel: z.string().min(2).max(50),
});

export const guardianGoogleAuthSchema = z.object({
  inviteCode: z.string().min(6).max(12),
  code: z.string().min(1),
  redirectUri: z.string().min(1),
  codeVerifier: z.string().optional(),
  clientId: z.string().optional(),
  roleLabel: z.string().min(2).max(50),
});

export const inviteCodeParamSchema = z.object({
  inviteCode: z.string().min(6).max(12),
});

export const passkeyRegisterOptionsSchema = z.object({});

export const passkeyRegisterVerifySchema = z.object({
  challengeToken: z.string().min(1),
  credential: z.any(),
});

export const passkeyLoginOptionsSchema = z.object({
  email: z.string().email().optional(),
});

export const createWishItemSchema = z.object({
  photoUrl: z.string().url().max(500),
  name: z.string().max(200).optional(),
  priceCents: z.number().int().min(0).optional(),
  desireLevel: z.number().int().min(1).max(3).default(2),
  note: z.string().max(500).optional(),
});

export const updateWishItemSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  desireLevel: z.number().int().min(1).max(3).optional(),
  status: z.enum(['active', 'conquered', 'archived']).optional(),
  note: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const passkeyLoginVerifySchema = z.object({
  challengeToken: z.string().min(1),
  credential: z.any(),
});

export const reorderWishItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1).max(100),
});
