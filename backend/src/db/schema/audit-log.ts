import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  actor: varchar('actor', { length: 50 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
