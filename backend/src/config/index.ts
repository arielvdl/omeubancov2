import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  RP_ID: z.string().default('api.omeubanco.xyz'),
  RP_NAME: z.string().default('O Meu Banco'),
  RP_ORIGIN: z.string().default('https://api.omeubanco.xyz'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
