import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { families } from './families.js';

export const guardians = pgTable(
  'guardians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    // Unicidade por família (não global): a mesma pessoa pode ser guardian
    // em mais de uma família (multi-família).
    email: varchar('email', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 100 }).notNull(),
    roleLabel: varchar('role_label', { length: 50 }).notNull(),
    accessLevel: varchar('access_level', { length: 20 }).notNull().default('member'),
    avatarUrl: text('avatar_url'),
    googleEmail: varchar('google_email', { length: 255 }),
    googleName: varchar('google_name', { length: 255 }),
    googlePhoto: text('google_photo'),
    invitedBy: uuid('invited_by').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    familyEmailUnique: uniqueIndex('guardians_family_email_unique')
      .on(t.familyId, t.email)
      .where(sql`${t.email} IS NOT NULL`),
    familyGoogleEmailUnique: uniqueIndex('guardians_family_google_email_unique')
      .on(t.familyId, t.googleEmail)
      .where(sql`${t.googleEmail} IS NOT NULL`),
    emailIdx: index('guardians_email_idx').on(t.email),
    googleEmailIdx: index('guardians_google_email_idx').on(t.googleEmail),
  })
);
