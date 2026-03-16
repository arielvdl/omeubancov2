import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contracts } from '../db/schema/contracts.js';

export type InsertContract = typeof contracts.$inferInsert;
export type SelectContract = typeof contracts.$inferSelect;

export const contractRepo = {
  async findActiveByChildId(childId: string): Promise<SelectContract | undefined> {
    const results = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.childId, childId), eq(contracts.isActive, true)))
      .limit(1);
    return results[0];
  },

  async create(data: InsertContract): Promise<SelectContract> {
    const results = await db.insert(contracts).values(data).returning();
    return results[0];
  },

  async deactivateByChildId(childId: string): Promise<void> {
    await db
      .update(contracts)
      .set({ isActive: false })
      .where(and(eq(contracts.childId, childId), eq(contracts.isActive, true)));
  },

  async signByChild(
    id: string,
    signatureData: string
  ): Promise<SelectContract | undefined> {
    const results = await db
      .update(contracts)
      .set({
        childSignedAt: new Date(),
        childSignatureData: signatureData,
      })
      .where(eq(contracts.id, id))
      .returning();
    return results[0];
  },
};
