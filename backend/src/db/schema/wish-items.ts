import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { children } from './children.js';

export const wishItems = pgTable('wish_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  photoUrl: varchar('photo_url', { length: 500 }).notNull(),
  name: varchar('name', { length: 200 }),
  priceCents: integer('price_cents'),
  desireLevel: integer('desire_level').notNull().default(2),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isGoal: boolean('is_goal').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  conqueredAt: timestamp('conquered_at', { withTimezone: true }),
  note: varchar('note', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
