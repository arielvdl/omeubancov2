import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { passkeyCredentials } from '../db/schema/passkey-credentials.js';

export type InsertPasskey = typeof passkeyCredentials.$inferInsert;
export type SelectPasskey = typeof passkeyCredentials.$inferSelect;

export const passkeyRepo = {
  async findByCredentialId(credentialId: string): Promise<SelectPasskey | undefined> {
    const results = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1);
    return results[0];
  },

  async findByFamilyId(familyId: string): Promise<SelectPasskey[]> {
    return db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.familyId, familyId));
  },

  async findByFamilyAndGuardian(
    familyId: string,
    guardianId?: string
  ): Promise<SelectPasskey[]> {
    if (guardianId) {
      return db
        .select()
        .from(passkeyCredentials)
        .where(
          and(
            eq(passkeyCredentials.familyId, familyId),
            eq(passkeyCredentials.guardianId, guardianId)
          )
        );
    }

    return db
      .select()
      .from(passkeyCredentials)
      .where(
        and(
          eq(passkeyCredentials.familyId, familyId),
          isNull(passkeyCredentials.guardianId)
        )
      );
  },

  async create(data: InsertPasskey): Promise<SelectPasskey> {
    const results = await db.insert(passkeyCredentials).values(data).returning();
    return results[0];
  },

  async updateCounter(id: string, counter: number): Promise<void> {
    await db
      .update(passkeyCredentials)
      .set({ counter })
      .where(eq(passkeyCredentials.id, id));
  },

  async delete(id: string): Promise<void> {
    await db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, id));
  },
};
