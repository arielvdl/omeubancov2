import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' })
    .unique(),
  revenuecatCustomerId: varchar('revenuecat_customer_id', { length: 255 }),
  entitlement: varchar('entitlement', { length: 50 }).notNull().default('free'),
  productId: varchar('product_id', { length: 100 }),
  store: varchar('store', { length: 20 }),
  isActive: boolean('is_active').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  originalPurchaseDate: timestamp('original_purchase_date', { withTimezone: true }),
  unsubscribeDetectedAt: timestamp('unsubscribe_detected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
