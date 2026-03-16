import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { children } from './children.js';

export const scheduledDeposits = pgTable('scheduled_deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  frequency: varchar('frequency', { length: 10 }).notNull(),
  dayOfWeek: integer('day_of_week'),
  dayOfMonth: integer('day_of_month'),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  status: varchar('status', { length: 15 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
