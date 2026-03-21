import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { devices } from '../db/schema/devices.js';

export type InsertDevice = typeof devices.$inferInsert;
export type SelectDevice = typeof devices.$inferSelect;

export const deviceRepo = {
  async findAll(): Promise<SelectDevice[]> {
    return db.select().from(devices);
  },

  async findByFamilyId(familyId: string): Promise<SelectDevice[]> {
    return db.select().from(devices).where(eq(devices.familyId, familyId));
  },

  async findByFamilyIds(familyIds: string[]): Promise<SelectDevice[]> {
    if (familyIds.length === 0) return [];
    return db.select().from(devices).where(inArray(devices.familyId, familyIds));
  },

  async findByPushToken(pushToken: string): Promise<SelectDevice | undefined> {
    const results = await db
      .select()
      .from(devices)
      .where(eq(devices.pushToken, pushToken))
      .limit(1);
    return results[0];
  },

  async upsert(data: InsertDevice): Promise<SelectDevice> {
    const existing = await this.findByPushToken(data.pushToken);
    if (existing) {
      const results = await db
        .update(devices)
        .set({
          familyId: data.familyId,
          childId: data.childId,
          platform: data.platform,
        })
        .where(eq(devices.pushToken, data.pushToken))
        .returning();
      return results[0];
    }
    const results = await db.insert(devices).values(data).returning();
    return results[0];
  },

  async deleteByPushToken(pushToken: string): Promise<void> {
    await db.delete(devices).where(eq(devices.pushToken, pushToken));
  },
};
