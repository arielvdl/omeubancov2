import { pgTable, uuid, varchar, text, bigint, boolean, timestamp } from 'drizzle-orm/pg-core';
import { families } from './families.js';
import { guardians } from './guardians.js';

export const passkeyCredentials = pgTable('passkey_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'cascade' }),
  credentialId: varchar('credential_id', { length: 512 }).notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).notNull().default(0),
  transports: varchar('transports', { length: 255 }),
  deviceType: varchar('device_type', { length: 32 }),
  backedUp: boolean('backed_up').default(false),
  webauthnUserId: varchar('webauthn_user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
