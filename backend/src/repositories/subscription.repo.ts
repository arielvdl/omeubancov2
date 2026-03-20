import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions } from '../db/schema/subscriptions.js';

export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;

export const subscriptionRepo = {
  async findByFamilyId(familyId: string): Promise<SelectSubscription | undefined> {
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.familyId, familyId))
      .limit(1);
    return results[0];
  },

  async upsert(data: InsertSubscription): Promise<SelectSubscription> {
    const results = await db
      .insert(subscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: subscriptions.familyId,
        set: {
          revenuecatCustomerId: data.revenuecatCustomerId,
          entitlement: data.entitlement,
          productId: data.productId,
          store: data.store,
          isActive: data.isActive,
          expiresAt: data.expiresAt,
          originalPurchaseDate: data.originalPurchaseDate,
          unsubscribeDetectedAt: data.unsubscribeDetectedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return results[0];
  },

  async deactivate(familyId: string): Promise<SelectSubscription | undefined> {
    const results = await db
      .update(subscriptions)
      .set({
        isActive: false,
        entitlement: 'free',
        unsubscribeDetectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.familyId, familyId))
      .returning();
    return results[0];
  },
};
