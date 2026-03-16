import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';

export const guardians = pgTable('guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 100 }).notNull(),
  roleLabel: varchar('role_label', { length: 50 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  googleEmail: varchar('google_email', { length: 255 }).unique(),
  googleName: varchar('google_name', { length: 255 }),
  googlePhoto: varchar('google_photo', { length: 500 }),
  invitedBy: uuid('invited_by').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
