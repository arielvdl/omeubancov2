import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions } from '../db/schema/transactions.js';
import type { TxSql } from '../db/types.js';

export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;

export const transactionRepo = {
  async findByChildId(
    childId: string,
    filters: { type?: string; page?: number; limit?: number } = {}
  ): Promise<{ data: SelectTransaction[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(transactions.childId, childId)];
    if (filters.type) {
      // 'deposit' filter should also include 'scheduled' (automatic deposits)
      if (filters.type === 'deposit') {
        conditions.push(sql`${transactions.type} IN ('deposit', 'scheduled')`);
      } else {
        conditions.push(eq(transactions.type, filters.type));
      }
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)!;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(whereClause)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(whereClause),
    ]);

    return { data, total: countResult[0].count };
  },

  async create(data: InsertTransaction): Promise<SelectTransaction> {
    const results = await db.insert(transactions).values(data).returning();
    return results[0];
  },

  async createInTx(
    txSql: TxSql,
    data: {
      childId: string;
      familyId: string;
      type: string;
      category: string;
      amount: number;
      balanceAfter: number;
      description: string;
      scheduledDepositId?: string;
      createdBy: string;
      receiptUrl?: string;
    }
  ): Promise<SelectTransaction> {
    const scheduledId = data.scheduledDepositId ?? null;
    const receiptUrl = data.receiptUrl ?? null;
    const result = await txSql`
      INSERT INTO transactions (
        child_id, family_id, type, category, amount, balance_after,
        description, scheduled_deposit_id, created_by, receipt_url
      ) VALUES (
        ${data.childId}::uuid,
        ${data.familyId}::uuid,
        ${data.type},
        ${data.category},
        ${data.amount},
        ${data.balanceAfter},
        ${data.description},
        ${scheduledId},
        ${data.createdBy},
        ${receiptUrl}
      )
      RETURNING *
    `;
    const row = result[0];
    return {
      id: row.id,
      childId: row.child_id,
      familyId: row.family_id,
      type: row.type,
      category: row.category,
      amount: row.amount,
      balanceAfter: row.balance_after,
      description: row.description,
      scheduledDepositId: row.scheduled_deposit_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      receiptUrl: row.receipt_url,
    };
  },

  async getSummary(
    childId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<{ totalDeposits: number; totalWithdrawals: number; net: number; count: number }> {
    const intervalMap = { week: '7 days', month: '30 days', year: '365 days' };
    const interval = intervalMap[period];

    const result = await db
      .select({
        totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN type IN ('deposit', 'scheduled') THEN amount ELSE 0 END), 0)::int`,
        totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.childId, childId),
          gte(transactions.createdAt, sql`NOW() - INTERVAL '${sql.raw(interval)}'`)
        )
      );

    const row = result[0];
    return {
      totalDeposits: row.totalDeposits,
      totalWithdrawals: row.totalWithdrawals,
      net: row.totalDeposits - row.totalWithdrawals,
      count: row.count,
    };
  },

  async getCategoryBreakdown(
    childId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<{ category: string; total: number; count: number }[]> {
    const intervalMap = { week: '7 days', month: '30 days', year: '365 days' };
    const interval = intervalMap[period];

    const results = await db
      .select({
        category: transactions.category,
        total: sql<number>`COALESCE(SUM(amount), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.childId, childId),
          gte(transactions.createdAt, sql`NOW() - INTERVAL '${sql.raw(interval)}'`)
        )
      )
      .groupBy(transactions.category);

    return results;
  },
};
