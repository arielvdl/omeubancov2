import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  masterPasswordHash: varchar('master_password_hash', { length: 255 }),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  googleEmail: varchar('google_email', { length: 255 }).unique(),
  googleName: varchar('google_name', { length: 255 }),
  googlePhoto: varchar('google_photo', { length: 500 }),
  appleUserId: varchar('apple_user_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
