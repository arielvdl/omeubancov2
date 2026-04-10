import { eq, and, desc } from 'drizzle-orm';
import { db, queryClient } from '../db/index.js';
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
    if (items.length === 0) return;
    if (items.length === 1) {
      await db
        .update(wishItems)
        .set({ sortOrder: items[0].sortOrder, updatedAt: new Date() })
        .where(eq(wishItems.id, items[0].id));
      return;
    }

    // Batch update: unnest arrays into a single parameterized UPDATE (no SQL injection risk)
    const ids = items.map((item) => item.id);
    const orders = items.map((item) => item.sortOrder);
    await queryClient`
      UPDATE wish_items AS w
      SET sort_order = v.sort_order, updated_at = NOW()
      FROM (SELECT unnest(${ids}::uuid[]) AS id, unnest(${orders}::int[]) AS sort_order) AS v
      WHERE w.id = v.id
    `;
  },
};
