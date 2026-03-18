import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { scheduledDeposits } from '../db/schema/scheduled-deposits.js';
import type { TxSql } from '../db/types.js';

export type InsertScheduledDeposit = typeof scheduledDeposits.$inferInsert;
export type SelectScheduledDeposit = typeof scheduledDeposits.$inferSelect;

export const scheduledDepositRepo = {
  async findById(id: string): Promise<SelectScheduledDeposit | undefined> {
    const results = await db
      .select()
      .from(scheduledDeposits)
      .where(eq(scheduledDeposits.id, id))
      .limit(1);
    return results[0];
  },

  async findByChildId(childId: string): Promise<SelectScheduledDeposit[]> {
    return db.select().from(scheduledDeposits).where(eq(scheduledDeposits.childId, childId));
  },

  async findDue(): Promise<SelectScheduledDeposit[]> {
    return db
      .select()
      .from(scheduledDeposits)
      .where(
        and(
          eq(scheduledDeposits.status, 'active'),
          lte(scheduledDeposits.nextRunAt, sql`NOW()`)
        )
      );
  },

  async create(data: InsertScheduledDeposit): Promise<SelectScheduledDeposit> {
    const results = await db.insert(scheduledDeposits).values(data).returning();
    return results[0];
  },

  async update(
    id: string,
    data: Partial<
      Pick<InsertScheduledDeposit, 'amount' | 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'status'>
    >
  ): Promise<SelectScheduledDeposit | undefined> {
    const results = await db
      .update(scheduledDeposits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduledDeposits.id, id))
      .returning();
    return results[0];
  },

  async updateNextRun(id: string, nextRunAt: Date, lastRunAt: Date): Promise<void> {
    await db
      .update(scheduledDeposits)
      .set({ nextRunAt, lastRunAt, updatedAt: new Date() })
      .where(eq(scheduledDeposits.id, id));
  },

  async updateNextRunInTx(
    txSql: TxSql,
    id: string,
    nextRunAt: Date,
    lastRunAt: Date
  ): Promise<void> {
    const nextRunIso = nextRunAt.toISOString();
    const lastRunIso = lastRunAt.toISOString();
    await txSql`
      UPDATE scheduled_deposits
      SET next_run_at = ${nextRunIso}::timestamptz, last_run_at = ${lastRunIso}::timestamptz, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  },
};
