import { db } from '../db/index.js';
import { auditLog } from '../db/schema/audit-log.js';

export type InsertAuditLog = typeof auditLog.$inferInsert;

export const auditLogRepo = {
  async create(data: InsertAuditLog): Promise<void> {
    await db.insert(auditLog).values(data);
  },
};
