import { pgTable, uuid, varchar, text, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';

export const children = pgTable('children', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  pinHash: varchar('pin_hash', { length: 255 }),
  avatarUrl: text('avatar_url'),
  mascotId: varchar('mascot_id', { length: 50 }).default('dino'),
  balance: integer('balance').notNull().default(0),
  birthDate: date('birth_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
