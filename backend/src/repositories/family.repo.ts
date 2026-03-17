import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { families } from '../db/schema/families.js';

export type InsertFamily = typeof families.$inferInsert;
export type SelectFamily = typeof families.$inferSelect;

export const familyRepo = {
  async findById(id: string): Promise<SelectFamily | undefined> {
    const results = await db.select().from(families).where(eq(families.id, id)).limit(1);
    return results[0];
  },

  async findByEmail(email: string): Promise<SelectFamily | undefined> {
    const results = await db
      .select()
      .from(families)
      .where(eq(families.email, email))
      .limit(1);
    return results[0];
  },

  async findByGoogleEmail(email: string): Promise<SelectFamily | undefined> {
    const results = await db
      .select()
      .from(families)
      .where(eq(families.googleEmail, email))
      .limit(1);
    return results[0];
  },

  async create(data: InsertFamily): Promise<SelectFamily> {
    const results = await db.insert(families).values(data).returning();
    return results[0];
  },

  async update(
    id: string,
    data: Partial<Pick<InsertFamily, 'name' | 'currency' | 'locale' | 'timezone'>>
  ): Promise<SelectFamily | undefined> {
    const results = await db
      .update(families)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(families.id, id))
      .returning();
    return results[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(families).where(eq(families.id, id));
  },
};
