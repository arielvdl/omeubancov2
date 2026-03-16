import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  RP_ID: z.string().default('queroomeubanco.app'),
  RP_NAME: z.string().default('O Meu Banco'),
  RP_ORIGIN: z.string().default('https://queroomeubanco.app'),
});

export const env = envSchema.parse(process.env);
