import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { children } from './children.js';
import { scheduledDeposits } from './scheduled-deposits.js';

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  scheduledDepositId: uuid('scheduled_deposit_id').references(() => scheduledDeposits.id),
  createdBy: varchar('created_by', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
