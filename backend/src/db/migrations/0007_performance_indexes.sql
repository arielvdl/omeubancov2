-- ============================================================
-- Migration 0007: Performance indexes
-- Adds missing indexes for all frequent query patterns
-- ============================================================

-- TRANSACTIONS: Most queried table
-- Covers: findByChildId (ORDER BY createdAt DESC), getSummary, getCategoryBreakdown
CREATE INDEX IF NOT EXISTS "idx_transactions_child_created"
  ON "transactions" ("child_id", "created_at" DESC);

-- Covers: receipt limit check (WHERE family_id = ? AND receipt_url IS NOT NULL)
CREATE INDEX IF NOT EXISTS "idx_transactions_family"
  ON "transactions" ("family_id");

-- Covers: getSummary and getCategoryBreakdown (time-range queries per child)
CREATE INDEX IF NOT EXISTS "idx_transactions_child_type"
  ON "transactions" ("child_id", "type");

-- SCHEDULED_DEPOSITS: Cron job findDue() is critical path
-- Covers: WHERE status = 'active' AND next_run_at <= NOW()
CREATE INDEX IF NOT EXISTS "idx_scheduled_deposits_due"
  ON "scheduled_deposits" ("status", "next_run_at")
  WHERE "status" = 'active';

-- Covers: findByChildId
CREATE INDEX IF NOT EXISTS "idx_scheduled_deposits_child"
  ON "scheduled_deposits" ("child_id");

-- CHILDREN: FK lookup is frequent
-- Covers: findByFamilyId (list children of a family)
CREATE INDEX IF NOT EXISTS "idx_children_family"
  ON "children" ("family_id");

-- GUARDIANS: Filtered by status in most queries
-- Covers: findByFamilyId WHERE status = 'active'
CREATE INDEX IF NOT EXISTS "idx_guardians_family_status"
  ON "guardians" ("family_id", "status");

-- DEVICES: Push notification lookups
-- Covers: findByFamilyId, findByFamilyIds (IN clause)
CREATE INDEX IF NOT EXISTS "idx_devices_family"
  ON "devices" ("family_id");

-- AUDIT_LOG: Write-heavy but may need reads
-- Covers: potential future queries by family + time ordering
CREATE INDEX IF NOT EXISTS "idx_audit_log_family_created"
  ON "audit_log" ("family_id", "created_at" DESC);

-- FAMILY_INVITATIONS: Status checks
-- Covers: countActivePending (WHERE family_id = ? AND status = 'pending' AND expires_at > NOW())
CREATE INDEX IF NOT EXISTS "idx_invitations_family_status"
  ON "family_invitations" ("family_id", "status");

-- PASSKEY_CREDENTIALS: Lookup by family
-- Covers: findByFamilyId, findByFamilyAndGuardian
CREATE INDEX IF NOT EXISTS "idx_passkey_family"
  ON "passkey_credentials" ("family_id");
