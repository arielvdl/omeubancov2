import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { children } from './children.js';

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }),
  pushToken: varchar('push_token', { length: 500 }).notNull().unique(),
  platform: varchar('platform', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
