import { eq } from 'drizzle-orm';
import { db, queryClient } from '../db/index.js';
import { children } from '../db/schema/children.js';
import type postgres from 'postgres';
import type { TxSql } from '../db/types.js';

export type InsertChild = typeof children.$inferInsert;
export type SelectChild = typeof children.$inferSelect;

function mapRow(row: postgres.Row): SelectChild {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    pinHash: row.pin_hash,
    avatarUrl: row.avatar_url,
    mascotId: row.mascot_id,
    balance: row.balance,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as SelectChild;
}

export const childRepo = {
  async findById(id: string): Promise<SelectChild | undefined> {
    const results = await db.select().from(children).where(eq(children.id, id)).limit(1);
    return results[0];
  },

  async findByFamilyId(familyId: string): Promise<SelectChild[]> {
    return db.select().from(children).where(eq(children.familyId, familyId));
  },

  async create(data: InsertChild): Promise<SelectChild> {
    const results = await db.insert(children).values(data).returning();
    return results[0];
  },

  async update(
    id: string,
    data: Partial<Pick<InsertChild, 'name' | 'avatarUrl' | 'mascotId' | 'birthDate' | 'pinHash'>>
  ): Promise<SelectChild | undefined> {
    const results = await db
      .update(children)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(children.id, id))
      .returning();
    return results[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  },

  async updateBalance(id: string, newBalance: number): Promise<SelectChild | undefined> {
    const results = await queryClient`
      UPDATE children
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;
    if (results.length === 0) return undefined;
    return mapRow(results[0]);
  },

  async findByIdForUpdate(txSql: TxSql, id: string): Promise<SelectChild | undefined> {
    const results = await txSql`
      SELECT * FROM children WHERE id = ${id}::uuid FOR UPDATE
    `;
    if (results.length === 0) return undefined;
    return mapRow(results[0]);
  },

  async updateBalanceInTx(txSql: TxSql, id: string, newBalance: number): Promise<void> {
    await txSql`
      UPDATE children SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  },

  getRawSql() {
    return queryClient;
  },
};
