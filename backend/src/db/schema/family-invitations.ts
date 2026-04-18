import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { guardians } from './guardians.js';

export const familyInvitations = pgTable('family_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  inviteCode: varchar('invite_code', { length: 12 }).unique().notNull(),
  invitedBy: uuid('invited_by').notNull(),
  accessLevel: varchar('access_level', { length: 20 }).notNull().default('member'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedByGuardianId: uuid('accepted_by_guardian_id').references(() => guardians.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
