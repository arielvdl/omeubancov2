import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { children } from './children.js';

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentSignedAt: timestamp('parent_signed_at', { withTimezone: true }),
  childSignedAt: timestamp('child_signed_at', { withTimezone: true }),
  childSignatureData: text('child_signature_data'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
