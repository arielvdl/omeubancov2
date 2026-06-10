import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { guardians } from '../db/schema/guardians.js';

export type InsertGuardian = typeof guardians.$inferInsert;
export type SelectGuardian = typeof guardians.$inferSelect;

export const guardianRepo = {
  async findById(id: string): Promise<SelectGuardian | undefined> {
    const results = await db.select().from(guardians).where(eq(guardians.id, id)).limit(1);
    return results[0];
  },

  async findByEmail(email: string): Promise<SelectGuardian | undefined> {
    const results = await db
      .select()
      .from(guardians)
      .where(eq(guardians.email, email))
      .limit(1);
    return results[0];
  },

  async findByGoogleEmail(email: string): Promise<SelectGuardian | undefined> {
    const results = await db
      .select()
      .from(guardians)
      .where(eq(guardians.googleEmail, email))
      .limit(1);
    return results[0];
  },

  // Multi-família: a mesma pessoa pode ter uma linha guardian por família.
  async findAllActiveByEmail(email: string): Promise<SelectGuardian[]> {
    return db
      .select()
      .from(guardians)
      .where(and(eq(guardians.email, email), eq(guardians.status, 'active')))
      .orderBy(guardians.createdAt);
  },

  async findAllActiveByGoogleEmail(email: string): Promise<SelectGuardian[]> {
    return db
      .select()
      .from(guardians)
      .where(and(eq(guardians.googleEmail, email), eq(guardians.status, 'active')))
      .orderBy(guardians.createdAt);
  },

  async findActiveByFamilyAndEmail(
    familyId: string,
    email: string
  ): Promise<SelectGuardian | undefined> {
    const results = await db
      .select()
      .from(guardians)
      .where(
        and(
          eq(guardians.familyId, familyId),
          eq(guardians.email, email),
          eq(guardians.status, 'active')
        )
      )
      .limit(1);
    return results[0];
  },

  async findActiveByFamilyAndGoogleEmail(
    familyId: string,
    email: string
  ): Promise<SelectGuardian | undefined> {
    const results = await db
      .select()
      .from(guardians)
      .where(
        and(
          eq(guardians.familyId, familyId),
          eq(guardians.googleEmail, email),
          eq(guardians.status, 'active')
        )
      )
      .limit(1);
    return results[0];
  },

  async findByFamilyId(familyId: string): Promise<SelectGuardian[]> {
    return db
      .select()
      .from(guardians)
      .where(and(eq(guardians.familyId, familyId), eq(guardians.status, 'active')));
  },

  async create(data: InsertGuardian): Promise<SelectGuardian> {
    const results = await db.insert(guardians).values(data).returning();
    return results[0];
  },

  async update(
    id: string,
    data: Partial<Pick<InsertGuardian, 'name' | 'roleLabel' | 'avatarUrl'>>
  ): Promise<SelectGuardian | undefined> {
    const results = await db
      .update(guardians)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guardians.id, id))
      .returning();
    return results[0];
  },

  async linkGoogleAccount(
    id: string,
    data: { googleEmail: string; googleName?: string | null; googlePhoto?: string | null }
  ): Promise<SelectGuardian | undefined> {
    const results = await db
      .update(guardians)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guardians.id, id))
      .returning();
    return results[0];
  },

  async remove(id: string): Promise<SelectGuardian | undefined> {
    const results = await db
      .update(guardians)
      .set({ status: 'removed', updatedAt: new Date() })
      .where(eq(guardians.id, id))
      .returning();
    return results[0];
  },
};
