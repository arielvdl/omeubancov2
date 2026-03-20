import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { wishItems } from '../db/schema/wish-items.js';

export type InsertWishItem = typeof wishItems.$inferInsert;
export type SelectWishItem = typeof wishItems.$inferSelect;

export const wishItemRepo = {
  async findByChildId(childId: string): Promise<SelectWishItem[]> {
    return db
      .select()
      .from(wishItems)
      .where(eq(wishItems.childId, childId))
      .orderBy(desc(wishItems.createdAt));
  },

  async findById(id: string): Promise<SelectWishItem | undefined> {
    const results = await db
      .select()
      .from(wishItems)
      .where(eq(wishItems.id, id));
    return results[0];
  },

  async create(data: InsertWishItem): Promise<SelectWishItem> {
    const results = await db.insert(wishItems).values(data).returning();
    return results[0];
  },

  async update(id: string, data: Partial<Omit<InsertWishItem, 'id' | 'childId' | 'createdAt'>>): Promise<SelectWishItem | undefined> {
    const results = await db
      .update(wishItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wishItems.id, id))
      .returning();
    return results[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(wishItems).where(eq(wishItems.id, id));
  },

  async setGoal(childId: string, wishItemId: string): Promise<SelectWishItem | undefined> {
    // First, unset any existing goal for this child
    await db
      .update(wishItems)
      .set({ isGoal: false, updatedAt: new Date() })
      .where(and(eq(wishItems.childId, childId), eq(wishItems.isGoal, true)));

    // Then set the new goal
    const results = await db
      .update(wishItems)
      .set({ isGoal: true, updatedAt: new Date() })
      .where(eq(wishItems.id, wishItemId))
      .returning();
    return results[0];
  },

  async clearGoal(childId: string): Promise<void> {
    await db
      .update(wishItems)
      .set({ isGoal: false, updatedAt: new Date() })
      .where(and(eq(wishItems.childId, childId), eq(wishItems.isGoal, true)));
  },

  async getGoal(childId: string): Promise<SelectWishItem | undefined> {
    const results = await db
      .select()
      .from(wishItems)
      .where(and(eq(wishItems.childId, childId), eq(wishItems.isGoal, true)));
    return results[0];
  },

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(wishItems)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(wishItems.id, item.id));
    }
  },
};
