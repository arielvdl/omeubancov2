import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { familyInvitations } from '../db/schema/family-invitations.js';

export type InsertFamilyInvitation = typeof familyInvitations.$inferInsert;
export type SelectFamilyInvitation = typeof familyInvitations.$inferSelect;

export const familyInvitationRepo = {
  async findById(id: string): Promise<SelectFamilyInvitation | undefined> {
    const results = await db
      .select()
      .from(familyInvitations)
      .where(eq(familyInvitations.id, id))
      .limit(1);
    return results[0];
  },

  async findByCode(inviteCode: string): Promise<SelectFamilyInvitation | undefined> {
    const results = await db
      .select()
      .from(familyInvitations)
      .where(eq(familyInvitations.inviteCode, inviteCode))
      .limit(1);
    return results[0];
  },

  async findByFamilyId(familyId: string): Promise<SelectFamilyInvitation[]> {
    return db
      .select()
      .from(familyInvitations)
      .where(eq(familyInvitations.familyId, familyId));
  },

  async create(data: InsertFamilyInvitation): Promise<SelectFamilyInvitation> {
    const results = await db.insert(familyInvitations).values(data).returning();
    return results[0];
  },

  async updateStatus(
    id: string,
    status: string,
    extraData?: { acceptedAt?: Date; acceptedByGuardianId?: string }
  ): Promise<SelectFamilyInvitation | undefined> {
    const results = await db
      .update(familyInvitations)
      .set({ status, ...extraData })
      .where(eq(familyInvitations.id, id))
      .returning();
    return results[0];
  },

  async countActivePending(familyId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(familyInvitations)
      .where(
        and(
          eq(familyInvitations.familyId, familyId),
          eq(familyInvitations.status, 'pending')
        )
      );
    return result[0]?.count ?? 0;
  },
};
